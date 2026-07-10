/* Life Ledger — engine.js
 * The simulation heartbeat. Time advances in hours; the engine executes the
 * player's daily schedule, then fires daily / monthly / yearly hooks on every
 * system. UI code registers callbacks (onLog, onAchievement, onChoice,
 * onAutosave) but the engine itself is headless — the selftest drives it in
 * Node with no DOM at all.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const U = LL.U;
  const D = LL.DATA;
  const St = LL.State;

  const E = (LL.Engine = LL.Engine || {});

  // UI hooks (all optional).
  E.onLog = null;         // (entry) => void  — toast feed
  E.onAchievement = null; // (ach) => void
  E.onChoice = null;      // (pendingEvent) => void — show modal; else auto-resolve
  E.onAutosave = null;    // (state) => void
  E.onGameOver = null;    // (state) => void

  // ------------------------------------------------------------- logging ---
  E.log = function (state, text, type) {
    const entry = { d: state.t.dayIndex, doy: state.t.dayOfYear, y: state.t.year, text, type: type || 'info' };
    state.you.log.unshift(entry);
    if (state.you.log.length > 400) state.you.log.pop();
    if (E.onLog) E.onLog(entry);
  };

  // ------------------------------------------------------------ schedule ---
  // Build today's 24-hour activity plan from the player's allocations.
  // Priority when over-booked: sleep, work, study, business, side hustle,
  // exercise, social, leisure. Unallocated hours become chores/downtime.
  E.buildDayPlan = function (state) {
    const y = state.you;
    const sch = y.schedule;
    const isWorkday = state.t.dow < 5;
    const workHours = y.job && isWorkday ? Math.round(D.CAREERS[y.job.careerId].hours / 5) : 0;
    const wanted = [
      ['sleep', U.clamp(Math.round(sch.sleep), 4, 12)],
      ['work', workHours],
      ['study', Math.round(sch.study)],
      ['business', y.businesses.length ? Math.round(sch.business) : 0],
      ['sideHustle', Math.round(sch.sideHustle)],
      ['exercise', Math.round(sch.exercise)],
      ['social', Math.round(sch.social)],
      ['leisure', Math.round(sch.leisure)],
    ];
    const plan = [];
    for (const [act, hours] of wanted) {
      for (let i = 0; i < hours && plan.length < 24; i++) plan.push(act);
    }
    while (plan.length < 24) plan.push('chores');
    state.dayPlan = plan;
    y.sleptHours = plan.filter((a) => a === 'sleep').length;
  };

  // ---------------------------------------------------------------- time ---
  function recomputeDate(state) {
    const t = state.t;
    const absDoy = state.birthDoY + t.dayIndex; // day 0 = 18th birthday
    t.dayOfYear = absDoy % 365;
    t.year = state.startYear + Math.floor(absDoy / 365);
    t.dow = t.dayIndex % 7;
  }

  // Advance exactly one hour. Returns false if the sim must stop (death/modal).
  E.advanceHour = function (state) {
    if (state.gameOver || state.pendingEvent) return false;
    const t = state.t;
    if (!state.dayPlan || state.dayPlan.length !== 24) E.buildDayPlan(state);

    const activity = state.dayPlan[t.hour];
    if (activity === 'sleep') {
      const y = state.you;
      y.stats.energy = U.clamp(y.stats.energy + 11, 0, 100);
      y.stats.stress = U.clamp(y.stats.stress - 0.7, 0, 100);
    } else {
      LL.Sys.doHour(state, activity);
    }

    t.hour++;
    if (t.hour >= 24) {
      t.hour = 0;
      t.dayIndex++;
      recomputeDate(state);
      startNewDay(state);
    }
    return !state.gameOver && !state.pendingEvent;
  };

  // Run up to `hours` of simulation (stops early on death or a choice modal).
  E.step = function (state, hours) {
    for (let i = 0; i < hours; i++) {
      if (!E.advanceHour(state)) break;
    }
  };

  // ------------------------------------------------------------ new day ----
  function startNewDay(state) {
    const y = state.you;
    const t = state.t;
    const Sys = LL.Sys;
    const cal = U.calFromDayOfYear(t.dayOfYear);

    // Daily system ticks.
    LL.Economy.tickDay(state);
    Sys.health.tickDay(state);
    Sys.health.tickDayLife(state);
    Sys.edu.tickDay(state);
    if (y.job) { y.job.daysInTier++; y.yearsWorked += 1 / 365; }
    if (y.pet) Sys.money.spend(state, 2 * state.eco.cpi, 'pet supplies');

    // Birthday!
    if (t.dayOfYear === state.birthDoY) {
      y.ageYears++;
      E.log(state, `🎂 Happy birthday — you turned ${y.ageYears}!`, 'info');
      if (Sys.health.mortalityCheck(state)) return endGame(state);
    }
    if (y.stats.health <= 0) {
      y.alive = false;
      y.deathCause = 'Your health gave out.';
      return endGame(state);
    }

    // Paydays on the 1st and 15th.
    if (cal.day === 1 || cal.day === 15) Sys.payday(state);

    // Monthly processing on the 1st.
    if (cal.day === 1) {
      LL.Economy.tickMonth(state);
      Sys.career.tickMonth(state);
      Sys.business.tickMonth(state);
      Sys.re.tickMonth(state);
      Sys.veh.tickMonth(state);
      Sys.invest.tickMonth(state);
      Sys.edu.tickMonth(state);
      Sys.social.tickMonth(state);
      Sys.payBillsMonthly(state);
      Sys.loans.tickMonth(state);
      const fin = y.fin;
      fin.lastMonthSpent = fin.spentThisMonth;
      fin.lastMonthEarned = fin.earnedThisMonth;
      fin.spentThisMonth = 0;
      fin.earnedThisMonth = 0;
    }

    // Tax settlement each Jan 5th (for the year just ended).
    if (t.dayOfYear === 4 && t.dayIndex > 300) Sys.settleTaxes(state);

    // Recession survival tracking.
    if (state.eco.regime === 'recession' && !state.inRecession) {
      state.inRecession = true;
      state.recessionNW = St.netWorth(state);
    } else if (state.eco.regime !== 'recession' && state.inRecession) {
      state.inRecession = false;
      if (St.netWorth(state) >= state.recessionNW * 0.95) {
        y.recessionsSurvived++;
        E.log(state, '🛡️ You made it through the recession with your finances intact.', 'good');
      }
    }

    // Random life event (at most one per day).
    rollEvent(state);

    // Weekly net-worth sample for the chart.
    if (t.dayIndex % 7 === 0) {
      const nw = Math.round(St.netWorth(state));
      y.fin.history.push(nw);
      if (y.fin.history.length > 1560) y.fin.history.shift();
      if (nw > y.peakNetWorth) y.peakNetWorth = nw;
    }

    checkAchievements(state);
    E.buildDayPlan(state);

    if (E.onAutosave && t.dayIndex % 7 === 3) E.onAutosave(state);
  }

  // -------------------------------------------------------------- events ---
  function rollEvent(state) {
    const rng = state.rngObj;
    if (!rng.chance(0.13)) return;
    const badMult = state.diff.badEvents || 1;
    const recent = state.recentEvents = state.recentEvents || {};
    const eligible = LL.EVENTS.filter((e) =>
      (!e.cond || e.cond(state)) && (recent[e.id] == null || state.t.dayIndex - recent[e.id] > 45));
    const ev = rng.weighted(eligible, (e) => e.w * (e.bad ? badMult : 1));
    if (!ev) return;
    recent[ev.id] = state.t.dayIndex;
    state.you.eventsSeen++;
    const text = typeof ev.text === 'function' ? ev.text(state) : ev.text;
    if (ev.choices) {
      state.pendingEvent = { id: ev.id, text, labels: ev.choices.map((c) => c.label) };
      if (E.onChoice) {
        E.onChoice(state.pendingEvent);
      } else {
        // Headless: lean sensible — pick the first (safe) option.
        E.resolveChoice(state, 0);
      }
    } else {
      E.log(state, text, ev.bad ? 'warn' : 'info');
      ev.apply(state);
    }
  }

  E.resolveChoice = function (state, idx) {
    const pe = state.pendingEvent;
    if (!pe) return;
    const ev = LL.EVENTS.find((e) => e.id === pe.id);
    state.pendingEvent = null;
    if (ev && ev.choices && ev.choices[idx]) {
      E.log(state, (typeof ev.text === 'function' ? '' : '') + `↳ ${pe.labels[idx]}`, 'info');
      ev.choices[idx].apply(state);
    }
  };

  // -------------------------------------------------------- achievements ---
  function checkAchievements(state) {
    const y = state.you;
    for (const a of LL.ACHIEVEMENTS) {
      if (y.achievements[a.id]) continue;
      let ok = false;
      try { ok = a.check(state); } catch (e) { ok = false; }
      if (ok) {
        y.achievements[a.id] = state.t.dayIndex;
        y.achievementCount++;
        E.log(state, `🏆 Achievement: ${a.icon} ${a.name} — ${a.desc}`, 'good');
        if (E.onAchievement) E.onAchievement(a);
      }
    }
  }

  // ------------------------------------------------------------ game over --
  function endGame(state) {
    const y = state.you;
    state.speed = 0;
    const nw = St.netWorth(state);
    state.gameOver = {
      cause: y.deathCause || 'The end.',
      age: y.ageYears,
      netWorth: nw,
      peak: y.peakNetWorth,
      achievements: y.achievementCount,
      children: y.children.length,
      married: !!(y.partner && y.partner.stage === 'married'),
      career: y.job ? D.CAREERS[y.job.careerId].tiers[y.job.tier].title
        : (y.workHistory.length ? y.workHistory[y.workHistory.length - 1].title : 'Unemployed'),
      // Legacy score: wealth + fulfillment, log-scaled so both paths matter.
      legacy: Math.round(
        Math.log10(Math.max(1, nw)) * 100 +
        y.achievementCount * 60 +
        y.children.length * 120 +
        y.stats.happiness * 3 +
        (y.ageYears - 18) * 10
      ),
    };
    E.log(state, `⚰️ ${state.gameOver.cause} You were ${y.ageYears}.`, 'bad');
    if (E.onGameOver) E.onGameOver(state);
  }
})(typeof window !== 'undefined' ? window : globalThis);
