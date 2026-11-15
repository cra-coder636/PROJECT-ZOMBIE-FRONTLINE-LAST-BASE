/* ============================================================
   SAVE SYSTEM — IndexedDB primary, localStorage fallback
   Slots: auto | slot1 | slot2 | slot3
   ============================================================ */
(function (ZF) {
  'use strict';
  var U = ZF.Util;
  var DB_NAME = 'zf_last_base', STORE = 'saves', DB_VER = 1;
  var SAVE_VERSION = 3;
  var SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
  var META_KEY = 'zf_profile_v2';

  var db = null, ready = false, backend = 'local';

  function openDB() {
    return new Promise(function (resolve, reject) {
      var idb;
      try { idb = window.indexedDB; } catch (e) { return reject(e); }
      if (!idb) return reject(new Error('no indexedDB'));
      var req;
      try { req = idb.open(DB_NAME, DB_VER); } catch (e) { return reject(e); }
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('idb error')); };
      req.onblocked = function () { reject(new Error('idb blocked')); };
      window.setTimeout(function () { if (!ready) reject(new Error('idb timeout')); }, 2500);
    });
  }

  function tx(mode, fn) {
    return new Promise(function (resolve, reject) {
      if (!db) return reject(new Error('db closed'));
      var t;
      try { t = db.transaction(STORE, mode); } catch (e) { return reject(e); }
      var store = t.objectStore(STORE);
      var out;
      try { out = fn(store); } catch (e) { return reject(e); }
      t.oncomplete = function () { resolve(out && out.__value !== undefined ? out.__value : out); };
      t.onerror = function () { reject(t.error); };
      t.onabort = function () { reject(t.error || new Error('aborted')); };
    });
  }

  var Save = ZF.Save = {
    SAVE_VERSION: SAVE_VERSION,
    SLOTS: SLOTS,
    get backend() { return backend; },

    init: function () {
      return openDB().then(function (d) {
        db = d; ready = true; backend = 'indexeddb';
        return backend;
      }).catch(function () {
        backend = 'local'; ready = true;
        db = null;
        return backend;
      });
    },

    /* -------- low level -------- */
    _write: function (slot, value) {
      var rec = { slot: slot, value: value, savedAt: Date.now() };
      function local() { U.store.set('zf_save_' + slot, rec); return true; }
      function localBackup() {
        var prev = U.store.get('zf_save_' + slot, null);
        if (prev) U.store.set('zf_save_' + slot + '_bak', prev);
      }
      if (backend === 'indexeddb' && db) {
        return Save._readRaw(slot).then(function (prev) {
          if (prev) return Save._writeRaw(slot + '__bak', prev).catch(function () {}).then(function () { return Save._writeRaw(slot, rec); });
          return Save._writeRaw(slot, rec);
        }).then(function () { local(); return true; })
          .catch(function () { localBackup(); return local(); });
      }
      localBackup();
      return Promise.resolve(local());
    },

    _writeRaw: function (key, rec) {
      return tx('readwrite', function (store) {
        store.put({ __value: rec }, key);
        return { __value: rec };
      });
    },

    _readRaw: function (slot) {
      if (backend === 'indexeddb' && db) {
        return tx('readonly', function (store) {
          var r = store.get(slot), box = {};
          r.onsuccess = function () {
            var v = r.result;
            box.__value = v ? (v.__value !== undefined ? v.__value : v.value) : null;
          };
          return box;
        }).catch(function () { return null; });
      }
      var l = U.store.get('zf_save_' + slot, null);
      return Promise.resolve(l ? l.value : null);
    },

    write: function (slot, payload) {
      payload.version = SAVE_VERSION;
      payload.slot = slot;
      payload.savedAt = Date.now();
      return Save._write(slot, payload);
    },

    read: function (slot) {
      function unwrap(v) {
        // IndexedDB keeps the slot record ({slot, value, savedAt}); storage
        // fallbacks keep it too, while auto-backups hold the same shape.
        return v && typeof v === 'object' && v.state === undefined && v.value && typeof v.value === 'object' ? v.value : v;
      }
      return Save._readRaw(slot).then(function (v) {
        v = unwrap(v);
        if (Save.validate(v)) return v;
        return Save._readRaw(slot + '__bak').then(function (b) {
          b = unwrap(b);
          if (Save.validate(b)) return b;
          var l = U.store.get('zf_save_' + slot, null);
          if (l && Save.validate(l.value)) return l.value;
          return null;
        });
      });
    },

    remove: function (slot) {
      function clearLocal() {
        U.store.del('zf_save_' + slot);
        U.store.del('zf_save_' + slot + '_bak');
      }
      if (backend === 'indexeddb' && db) {
        return Promise.all([
          Save._writeRaw(slot, null).catch(function () {}),
          Save._writeRaw(slot + '__bak', null).catch(function () {})
        ]).then(clearLocal);
      }
      clearLocal();
      return Promise.resolve();
    },

    /* -------- validation & recovery -------- */
    validate: function (v) {
      if (!v || typeof v !== 'object') return false;
      if (typeof v.version !== 'number') return false;
      var s = v.state;
      if (!s || typeof s !== 'object') return false;
      if (!s.mapId || !ZF.Data || !ZF.Data.mapsById[s.mapId]) return false;
      if (typeof s.wave !== 'number' || s.wave < 0 || s.wave > 100000) return false;
      if (typeof s.baseHp !== 'number' || !isFinite(s.baseHp)) return false;
      if (!Array.isArray(s.towers)) return false;
      if (!Array.isArray(s.research)) s.research = [];
      if (!s.resources || typeof s.resources.credits !== 'number') return false;
      for (var i = 0; i < s.towers.length; i++) {
        var t = s.towers[i];
        if (!t || !t.id || typeof t.tx !== 'number' || typeof t.ty !== 'number') return false;
      }
      return true;
    },

    list: function () {
      var slots = SLOTS;
      return Promise.all(slots.map(function (slot) {
        return Save.read(slot).then(function (v) {
          if (!v) return { slot: slot, empty: true };
          return {
            slot: slot, empty: false, savedAt: v.savedAt, version: v.version,
            mapId: v.state.mapId, mode: v.state.mode, wave: v.state.wave,
            stage: Math.floor((v.state.wave - 1) / 10) + 1,
            kills: v.state.stats ? v.state.stats.kills : 0,
            time: v.state.stats ? v.state.stats.time : 0,
            baseHp: v.state.baseHp, baseMaxHp: v.state.baseMaxHp,
            resources: v.state.resources
          };
        }).catch(function () { return { slot: slot, empty: true, error: true }; });
      }));
    },

    latest: function () {
      return Save.list().then(function (l) {
        var best = null;
        l.forEach(function (s) { if (!s.empty && (!best || s.savedAt > best.savedAt)) best = s; });
        return best;
      });
    },

    /* -------- profile (meta progression survives runs) -------- */
    loadProfile: function () {
      var p = U.store.get(META_KEY, null);
      if (!p || typeof p !== 'object') p = {};
      p.research = p.research || {};
      p.unlocks = p.unlocks || { units: [], maps: [] };
      p.best = p.best || { wave: 0, stage: 1, kills: 0, time: 0, score: 0 };
      p.totalKills = p.totalKills || 0;
      p.runs = p.runs || 0;
      p.rp = typeof p.rp === 'number' ? p.rp : 0;
      p.achievements = p.achievements || [];
      p.seenTutorial = !!p.seenTutorial;
      return p;
    },
    saveProfile: function (p) { U.store.set(META_KEY, p); return p; }
  };
})(window.ZF);
