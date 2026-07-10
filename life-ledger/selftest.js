#!/usr/bin/env node
/* Life Ledger — headless selftest.
 * Runs the full simulation in Node (no DOM, no UI): creates a character,
 * plays several in-game years with a scripted "sensible player" policy, and
 * asserts core invariants along the way. Exits non-zero on any failure.
 *
 *   node selftest.js [years]
 */
'use strict';

require('./js/util.js');
require('./js/data.js');
require('./js/economy.js');
require('./js/state.js');
require('./js/systems.js');
require('./js/events.js');
require('./js/engine.js');

const LL = globalThis.LL;
const { State: St, Engine: E, Sys, DATA: D, U } = LL;

const YEARS = Math.max(1, parseInt(process.argv[2], 10) || 6);
let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.error('  ✗ FAIL: ' + msg); }
}

function assertFinite(state, where) {
  const y = state.you;
  const vals = {
    checking: y.fin.checking, savings: y.fin.savings,
    netWorth: St.netWorth(state), health: y.stats.health,
    energy: y.stats.energy, stress: y.stats.stress, happiness: y.stats.happiness,
    cpi: state.eco.cpi, credit: y.fin.creditScore,
  };
  for (const [k, v] of Object.entries(vals)) {
    check(Number.isFinite(v), `${k} is not finite (${v}) ${where}`);
  }
  for (const sym of Object.keys(state.eco.assets)) {
    check(Number.isFinite(state.eco.assets[sym].price) && state.eco.assets[sym].price > 0,
      `asset ${sym} price invalid ${where}`);
  }
  check(y.stats.health >= 0 && y.stats.health <= 100, `health out of range ${where}`);
  check(y.fin.creditScore >= 300 && y.fin.creditScore <= 850, `credit score out of range ${where}`);
}

// A simple "reasonable person" policy applied once per in-game week.
function policy(state) {
  const y = state.you;
  const cash = y.fin.checking;

  // Year 1: study for an IT cert, then apply to software via skills; fallback retail.
  if (!y.education.current && !y.education.completed.includes('cert_it')) {
    Sys.edu.enroll(state, 'cert_it');
    y.schedule.study = 4;
    y.studyFocus = 'programming';
  }
  if (!y.job) {
    const tryOrder = ['software', 'office', 'logistics', 'retail', 'food'];
    for (const c of tryOrder) {
      const r = Sys.career.apply(state, c);
      if (r.hired) break;
    }
  }
  // Keep studying programming on the side.
  if (!y.education.current) { y.schedule.study = 2; y.studyFocus = 'programming'; }

  // Move out of the parents' place once income exists.
  if (y.home.kind === 'rent' && y.home.id === 'parents' && y.job && cash > 4000) {
    Sys.re.moveToRental(state, 'studio');
  }
  // Buy a beater once affordable.
  if (y.vehicle === 'transit' && cash > 12000) Sys.veh.buy(state, 'beater', false);
  // Health insurance once affordable.
  if (y.healthIns === 'none' && cash > 6000) y.healthIns = 'basic';
  // Park surplus: savings buffer then index fund.
  if (cash > 9000) Sys.money.transfer(state, cash - 6000, true);
  if (y.fin.savings > 15000) {
    const invest = y.fin.savings - 10000;
    Sys.money.transfer(state, invest, false);
    Sys.invest.buy(state, 'TMF', invest);
  }
  // Pay down the credit card aggressively.
  if (y.fin.creditCard.balance > 0 && cash > 2000) {
    Sys.money.payCard(state, Math.min(cash - 1500, y.fin.creditCard.balance));
  }
  // Social & exercise hygiene.
  y.schedule.exercise = 1; y.schedule.social = 2; y.schedule.sleep = 8;
  if (y.friends.length < 2 && y.stats.energy > 40) Sys.social.meetFriend(state);
  if (!y.partner && y.singles.length && state.rngObj.chance(0.2)) Sys.social.askOut(state, 0);
  if (y.partner) {
    if (y.stats.energy > 30) Sys.social.dateNight(state);
    if (y.partner.stage === 'dating' && y.partner.closeness > 70 && cash > 8000) Sys.social.propose(state);
    if (y.partner.stage === 'engaged' && cash > 15000) Sys.social.marry(state, 8000);
  }
  // Try a business once established.
  if (!y.businesses.length && y.fin.savings + cash > 45000 && y.skills.programming > 40) {
    Sys.business.start(state, 'saas', 'TestCo');
    y.schedule.business = 2;
  }
  // Ask for a raise now and then.
  if (y.job && state.rngObj.chance(0.15)) Sys.career.askRaise(state);
}

console.log(`Life Ledger selftest — simulating ${YEARS} in-game years...`);

const state = St.attachRng(St.newGame({
  name: 'Test Subject', gender: 'other', cityId: 'harborton',
  difficulty: 'normal', traits: ['analytical', 'disciplined'], seed: 1337,
}));

const t0 = Date.now();
let lastPolicyWeek = -1;
const totalDays = YEARS * 365;
while (state.t.dayIndex < totalDays && !state.gameOver) {
  E.step(state, 24);
  if (state.pendingEvent) {
    check(state.pendingEvent.labels.length >= 2, 'choice event has options');
    E.resolveChoice(state, 0);
  }
  const week = Math.floor(state.t.dayIndex / 7);
  if (week !== lastPolicyWeek) {
    lastPolicyWeek = week;
    policy(state);
  }
  if (state.t.dayIndex % 365 === 0) assertFinite(state, `@day ${state.t.dayIndex}`);
}
const ms = Date.now() - t0;

assertFinite(state, 'at end');
const y = state.you;

// --- invariants & sanity ---------------------------------------------------
check(state.t.dayIndex >= totalDays || state.gameOver, 'sim reached target duration');
if (state.gameOver) {
  check(state.gameOver.legacy > 0 && Number.isFinite(state.gameOver.netWorth), 'game-over summary is well-formed');
  console.log(`  (character died at ${state.gameOver.age}: ${state.gameOver.cause} — legacy ${state.gameOver.legacy})`);
} else {
  check(y.ageYears >= 18 + YEARS - 1, `aged correctly (age=${y.ageYears})`);
}
check(y.log.length > 10, 'life log has entries');
check(y.eventsSeen > 5, `random events fired (${y.eventsSeen})`);
check(y.fin.history.length > 40, 'net worth history recorded');
check(Object.keys(y.achievements).length >= 2, `achievements earned (${Object.keys(y.achievements).length})`);
check(y.workHistory.length + (y.job ? 1 : 0) > 0, 'player got a job at some point');
check(y.education.completed.length >= 1, 'completed the IT certification');
// ~2.5%/yr average inflation compounds; allow a generous band around it.
const cpiCeil = Math.pow(1.06, YEARS) + 0.2;
check(state.eco.cpi > 1.0 && state.eco.cpi < cpiCeil,
  `inflation accumulated sanely (cpi=${state.eco.cpi.toFixed(3)}, ceil=${cpiCeil.toFixed(2)})`);
check(y.fin.lastTax && y.fin.lastTax.liability >= 0, 'taxes were settled at least once');

// --- save / load round-trip -------------------------------------------------
const json = St.serialize(state);
const loaded = St.deserialize(json);
check(Math.abs(St.netWorth(loaded) - St.netWorth(state)) < 0.01, 'save/load preserves net worth');
E.step(loaded, 24 * 30); // a loaded game must keep simulating
if (loaded.pendingEvent) E.resolveChoice(loaded, 0);
assertFinite(loaded, 'after load+30d');

// --- determinism: same seed twice gives identical outcomes ------------------
function run(seed, days) {
  const s = St.attachRng(St.newGame({ name: 'D', cityId: 'harborton', difficulty: 'normal', traits: [], seed }));
  while (s.t.dayIndex < days && !s.gameOver) {
    E.step(s, 24);
    if (s.pendingEvent) E.resolveChoice(s, 0);
  }
  return St.netWorth(s) + ',' + s.eco.assets.TMF.price.toFixed(6);
}
check(run(42, 200) === run(42, 200), 'simulation is deterministic for a fixed seed');

// --- report -----------------------------------------------------------------
const title = y.job ? D.CAREERS[y.job.careerId].tiers[y.job.tier].title : 'unemployed';
console.log(`
  Simulated ${Math.floor(state.t.dayIndex / 365)}y ${state.t.dayIndex % 365}d in ${ms}ms
  Age ${y.ageYears} — ${title}${y.job ? ' @ ' + U.money(St.salary(state)) + '/yr' : ''}
  Net worth ${U.money(St.netWorth(state))} (peak ${U.money(y.peakNetWorth)})
  Checking ${U.money(y.fin.checking)} | Savings ${U.money(y.fin.savings)} | Portfolio ${U.money(St.portfolioValue(state))}
  Credit ${Math.round(y.fin.creditScore)} | Skills: prog ${Math.round(y.skills.programming)}, comm ${Math.round(y.skills.communication)}
  Health ${Math.round(y.stats.health)} | Happiness ${Math.round(y.stats.happiness)} | Stress ${Math.round(y.stats.stress)}
  Partner: ${y.partner ? y.partner.name + ' (' + y.partner.stage + ')' : 'single'} | Kids: ${y.children.length} | Friends: ${y.friends.length}
  Businesses: ${y.businesses.map((b) => b.name + ' ' + U.money(Sys.business.valuation(state, b))).join(', ') || 'none'}
  Achievements: ${Object.keys(y.achievements).length} | Events seen: ${y.eventsSeen}
  Economy: ${state.eco.regime}, inflation ${U.pct(state.eco.inflation)}, TMF ${U.moneyExact(state.eco.assets.TMF.price)}
`);

if (failures) {
  console.error(`SELFTEST FAILED — ${failures} check(s) failed.`);
  process.exit(1);
}
console.log('SELFTEST PASSED ✅');
