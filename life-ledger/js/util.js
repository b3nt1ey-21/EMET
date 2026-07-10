/* Life Ledger — util.js
 * Shared helpers: seeded RNG, formatting, math. Attaches to the LL namespace.
 * Every file uses the same wrapper so the game runs from file:// in a browser
 * (classic script tags, no build step) and headless in Node for the selftest.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});

  const U = (LL.U = {});

  // ---------------------------------------------------------------- math ---
  U.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.round2 = (v) => Math.round(v * 100) / 100;

  // ----------------------------------------------------------------- rng ---
  // mulberry32 — tiny, fast, good enough, and its whole state is one int,
  // so it serializes with the save file and replays deterministically.
  U.makeRng = function (seed) {
    let s = seed >>> 0;
    const rng = {
      get state() { return s; },
      set state(v) { s = v >>> 0; },
      next() {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range(lo, hi) { return lo + rng.next() * (hi - lo); },
      int(lo, hi) { return Math.floor(rng.range(lo, hi + 1)); }, // inclusive
      chance(p) { return rng.next() < p; },
      pick(arr) { return arr[Math.floor(rng.next() * arr.length)]; },
      // Standard normal via Box–Muller (one sample per call is fine here).
      gauss() {
        let u = 0, v = 0;
        while (u === 0) u = rng.next();
        while (v === 0) v = rng.next();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      },
      weighted(items, weightOf) {
        let total = 0;
        for (const it of items) total += weightOf(it);
        if (total <= 0) return null;
        let roll = rng.next() * total;
        for (const it of items) {
          roll -= weightOf(it);
          if (roll <= 0) return it;
        }
        return items[items.length - 1];
      },
    };
    return rng;
  };

  // ---------------------------------------------------------- formatting ---
  U.money = function (v, opts) {
    const compactAt = (opts && opts.compactAt) || 1e6;
    const sign = v < 0 ? '-' : '';
    const a = Math.abs(v);
    if (a >= compactAt) {
      const units = [ [1e12, 'T'], [1e9, 'B'], [1e6, 'M'] ];
      for (const [m, suf] of units) {
        if (a >= m) return sign + '$' + (a / m).toFixed(a / m >= 100 ? 0 : 2) + suf;
      }
    }
    return sign + '$' + Math.round(a).toLocaleString('en-US');
  };
  U.moneyExact = (v) =>
    (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  U.pct = (v, d) => (v * 100).toFixed(d == null ? 1 : d) + '%';
  U.signedMoney = (v) => (v >= 0 ? '+' : '') + U.money(v);
  U.hours = (h) => (h >= 24 ? Math.round(h / 24) + 'd ' + Math.round(h % 24) + 'h' : Math.round(h) + 'h');

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Fixed 365-day year, 12 months of 30/31 days (Feb gets 30 — it's a game).
  const MONTH_LEN = [31, 30, 31, 30, 31, 30, 31, 31, 30, 31, 30, 30];
  U.MONTH_LEN = MONTH_LEN;
  U.calFromDayOfYear = function (doy) {
    let m = 0, d = doy;
    while (d >= MONTH_LEN[m]) { d -= MONTH_LEN[m]; m++; }
    return { month: m, day: d + 1, monthName: MONTHS[m] };
  };
  U.dateStr = function (t) {
    const c = U.calFromDayOfYear(t.dayOfYear);
    return DOW[t.dow] + ', ' + c.monthName + ' ' + c.day + ', ' + t.year;
  };
  U.shortDate = function (t) {
    const c = U.calFromDayOfYear(t.dayOfYear);
    return c.monthName + ' ' + c.day + ', ' + t.year;
  };

  // ------------------------------------------------------------- strings ---
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  U.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  U.FIRST_NAMES = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Avery', 'Quinn', 'Maya', 'Elena',
    'Marcus', 'Devon', 'Priya', 'Kai', 'Nina', 'Omar', 'Lucia', 'Theo', 'Ivy', 'Hassan',
    'Grace', 'Felix', 'Dana', 'Rosa', 'Victor', 'Wren', 'Jules', 'Amara', 'Leo', 'Sofia'];
  U.LAST_NAMES = ['Reyes', 'Chen', 'Okafor', 'Novak', 'Silva', 'Haddad', 'Kim', 'Fisher', 'Moreau', 'Petrov',
    'Ngata', 'Alvarez', 'Brooks', 'Tanaka', 'Weber', 'Osei', 'Lindqvist', 'Romano', 'Duarte', 'Kaur'];
})(typeof window !== 'undefined' ? window : globalThis);
