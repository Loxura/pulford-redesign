/* PULFORD — rental availability layer (demo)
   A fake shared "database" living in localStorage key `pf-rentals`, read and
   written by the public pages (shop, product) AND the CMS (rentals.html).
   Same-origin, so all pages see the same data; the `storage` event lets one
   tab update live when another changes it.

   This is also the single source of truth for the 14 games' ids / names /
   prices (previously duplicated across shop.html and product.html). */
window.PF = (function () {
  var KEY = 'pf-rentals';

  // canonical catalogue — id -> {name, weekday $, weekend $}
  var GAMES = {
    jenga:    { name: 'Giant Jenga',          wd: 45, we: 60 },
    tictactoe:{ name: 'Giant Tic-Tac-Toe',    wd: 25, we: 40 },
    connect4: { name: 'Giant Connect 4',      wd: 60, we: 75 },
    cornhole: { name: 'Cornhole Toss',        wd: 45, we: 60 },
    ladder:   { name: 'Ladder Golf',          wd: 50, we: 65 },
    yardzee:  { name: 'Giant Yardzee',        wd: 40, we: 55 },
    dominoes: { name: 'Giant Dominoes',        wd: 25, we: 40 },
    washer:   { name: 'Washer Toss',          wd: 35, we: 50 },
    bocce:    { name: 'Bocce',                wd: 40, we: 55 },
    cliff:    { name: 'Cliff Hanger',         wd: 45, we: 60 },
    balldrop: { name: 'Ball Drop',            wd: 40, we: 55 },
    football: { name: 'Target Football Toss', wd: 45, we: 60 },
    ringtoss: { name: 'Ring Toss',            wd: 25, we: 40 },
    golfpong: { name: 'Golf Pong',            wd: 45, we: 60 }
  };
  var IDS = Object.keys(GAMES);

  // ---- date helpers (local time, YYYY-MM-DD strings) ----
  function fmt(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  function todayStr() { return fmt(new Date()); }
  function plus(n) { var d = new Date(); d.setDate(d.getDate() + n); return fmt(d); }
  function datesFor(date, days) {
    var out = [];
    if (!date) return out;
    days = Math.max(0, days | 0);
    var d = new Date(date + 'T00:00:00');
    if (isNaN(d.getTime())) return out;
    for (var i = 0; i <= days; i++) { out.push(fmt(d)); d.setDate(d.getDate() + 1); }
    return out;
  }

  // ---- store ----
  function defaultStore() {
    var g = {};
    IDS.forEach(function (id) { g[id] = { listed: true, blocked: [] }; });
    return { games: g, bookings: [] };
  }
  function normalize(s) {
    if (!s || typeof s !== 'object') s = {};
    var src = (s.games && typeof s.games === 'object') ? s.games : {};
    var g = {};
    IDS.forEach(function (id) {
      var e = src[id] || {};
      g[id] = { listed: e.listed !== false, blocked: Array.isArray(e.blocked) ? e.blocked.slice() : [] };
    });
    return { games: g, bookings: Array.isArray(s.bookings) ? s.bookings : [] };
  }
  function getStore() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); }
    catch (e) { return defaultStore(); }
  }
  function saveStore(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function seedIfEmpty() {
    try { if (localStorage.getItem(KEY) !== null) return; } catch (e) { return; }
    var s = defaultStore();
    // a retired game so the "Unavailable" path shows immediately
    s.games.connect4.listed = false;
    // a busy upcoming weekend — overlapping dates so a multi-game booking can partially conflict
    s.games.jenga.blocked = [plus(5), plus(6)];
    s.games.cornhole.blocked = [plus(5)];
    s.games.bocce.blocked = [plus(12)];
    // a pre-existing staff booking so the CMS panel isn't empty
    s.bookings.push({
      id: 'bk_seed1', games: ['yardzee', 'ladder'], date: plus(9), days: 0,
      name: 'Lakeside Community Centre', email: 'events@lakeside.example',
      status: 'requested', source: 'staff', created: new Date().toISOString()
    });
    blockSpan(s, ['yardzee', 'ladder'], plus(9), 0);
    saveStore(s);
  }

  // ---- queries ----
  function isListed(id) { var g = getStore().games[id]; return !!(g && g.listed === true); }
  function isGameAvailable(id, date, days) {
    var g = getStore().games[id];
    if (!g || g.listed !== true) return false;
    if (!date) return true;
    var span = datesFor(date, days || 0);
    for (var i = 0; i < span.length; i++) { if (g.blocked.indexOf(span[i]) >= 0) return false; }
    return true;
  }

  // ---- mutations ----
  function setListed(id, listed) {
    var s = getStore();
    if (s.games[id]) { s.games[id].listed = !!listed; saveStore(s); }
  }
  function blockSingle(id, date) {
    var s = getStore(), g = s.games[id];
    if (g && date && g.blocked.indexOf(date) < 0) { g.blocked.push(date); g.blocked.sort(); saveStore(s); }
  }
  function unblockDate(id, date) {
    var s = getStore(), g = s.games[id];
    if (g) { var i = g.blocked.indexOf(date); if (i >= 0) { g.blocked.splice(i, 1); saveStore(s); } }
  }
  function blockSpan(store, ids, date, days) {
    var span = datesFor(date, days || 0);
    ids.forEach(function (id) {
      var g = store.games[id];
      if (!g) return;
      span.forEach(function (d) { if (g.blocked.indexOf(d) < 0) g.blocked.push(d); });
      g.blocked.sort();
    });
  }
  function blockDates(ids, date, days) { var s = getStore(); blockSpan(s, ids, date, days); saveStore(s); }
  function addBooking(b) {
    var s = getStore();
    var booking = {
      id: 'bk_' + Date.now(), games: (b.games || []).slice(), date: b.date, days: b.days || 0,
      name: b.name || '', email: b.email || '', status: 'requested', source: 'web',
      created: new Date().toISOString()
    };
    s.bookings.push(booking);
    blockSpan(s, booking.games, booking.date, booking.days);
    saveStore(s);
    return booking;
  }

  function onChange(fn) {
    window.addEventListener('storage', function (e) { if (e.key === KEY) fn(getStore()); });
  }

  return {
    GAMES: GAMES, IDS: IDS,
    today: todayStr, datesFor: datesFor,
    getStore: getStore, saveStore: saveStore, seedIfEmpty: seedIfEmpty,
    isListed: isListed, setListed: setListed, isGameAvailable: isGameAvailable,
    blockSingle: blockSingle, unblockDate: unblockDate, blockDates: blockDates,
    addBooking: addBooking, onChange: onChange
  };
})();
