/* Life Ledger — systems.js
 * The gameplay systems. Each namespace under LL.Sys owns one domain and is
 * driven by the engine's hourly/daily/monthly/yearly hooks plus direct player
 * actions from the UI. Systems interact only through the shared state and the
 * money helpers, so cause-and-effect flows across all of them.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const D = LL.DATA;
  const U = LL.U;
  const St = LL.State;

  const Sys = (LL.Sys = {});
  const log = (s, m, t) => LL.Engine.log(s, m, t);

  // ==================================================================== $$$ =
  const money = (Sys.money = {});

  money.earn = function (state, amt, label) {
    state.you.fin.checking += amt;
    state.you.fin.earnedThisMonth += amt;
    return amt;
  };

  // Spend with fallbacks: checking → savings → credit card → missed payment.
  // Returns true if fully covered (even on credit), false if it bounced.
  money.spend = function (state, amt, label, opts) {
    const fin = state.you.fin;
    opts = opts || {};
    fin.spentThisMonth += amt;
    if (fin.checking >= amt) { fin.checking -= amt; return true; }
    let rem = amt - Math.max(0, fin.checking);
    fin.checking = Math.min(fin.checking, 0) === 0 ? 0 : fin.checking; // keep 0 floor
    if (fin.checking > 0) fin.checking = 0;
    if (fin.savings > 0) {
      const take = Math.min(fin.savings, rem);
      fin.savings -= take; rem -= take;
      if (rem <= 0.005) return true;
    }
    const cc = fin.creditCard;
    if (!opts.noCredit && cc.limit - cc.balance >= rem) {
      cc.balance += rem;
      log(state, `💳 ${label || 'A bill'} overflowed onto your credit card (${U.money(rem)}).`, 'warn');
      return true;
    }
    // Bounced.
    fin.missedPayments++;
    fin.onTimeStreak = 0;
    fin.creditScore = U.clamp(fin.creditScore - 35, 300, 850);
    state.you.stats.stress = U.clamp(state.you.stats.stress + 8, 0, 100);
    log(state, `❌ Missed payment: ${label || 'a bill'} (${U.money(rem)} short). Credit score takes a hit.`, 'bad');
    return false;
  };

  // Hard purchase: only goes through if actually affordable (checking+savings).
  money.buy = function (state, amt, label) {
    const fin = state.you.fin;
    if (fin.checking + fin.savings < amt) return false;
    fin.spentThisMonth += amt;
    if (fin.checking >= amt) { fin.checking -= amt; return true; }
    const rem = amt - fin.checking;
    fin.checking = 0;
    fin.savings -= rem;
    return true;
  };

  money.transfer = function (state, amt, toSavings) {
    const fin = state.you.fin;
    amt = Math.max(0, amt);
    if (toSavings) {
      amt = Math.min(amt, fin.checking);
      fin.checking -= amt; fin.savings += amt;
    } else {
      amt = Math.min(amt, fin.savings);
      fin.savings -= amt; fin.checking += amt;
    }
    return amt;
  };

  money.payCard = function (state, amt) {
    const fin = state.you.fin;
    amt = Math.min(amt, fin.creditCard.balance, fin.checking);
    if (amt <= 0) return 0;
    fin.checking -= amt;
    fin.creditCard.balance -= amt;
    return amt;
  };

  // ---------------------------------------------------------------- loans --
  const loans = (Sys.loans = {});

  loans.paymentFor = function (principal, annualRate, months) {
    const r = annualRate / 12;
    if (r <= 0) return principal / months;
    return (principal * r) / (1 - Math.pow(1 + r, -months));
  };

  loans.maxAmount = function (state, kind) {
    const y = state.you;
    const income = Math.max(St.salary(state), 18000 * state.eco.cpi);
    switch (kind) {
      case 'personal': return Math.min(40000 * state.eco.cpi, income * 0.6);
      case 'student': return 250000;
      case 'auto': return income * 1.2;
      case 'mortgage': return income * 5 + y.fin.savings + y.fin.checking;
      case 'business': return Math.min(300000 * state.eco.cpi, income * 3 + 25000);
      default: return 0;
    }
  };

  loans.take = function (state, kind, amount, months, label) {
    const fin = state.you.fin;
    const t = D.LOAN_TYPES[kind];
    if (fin.creditScore < t.minCredit) {
      return { ok: false, msg: `Denied — ${t.name} needs a ${t.minCredit}+ credit score.` };
    }
    if (amount > loans.maxAmount(state, kind)) {
      return { ok: false, msg: 'Denied — that amount is beyond what lenders will offer you.' };
    }
    months = U.clamp(months || t.maxTerm, 6, t.maxTerm);
    const rate = LL.Economy.loanRate(state, kind, fin.creditScore);
    const loan = {
      id: fin.nextLoanId++, kind, principal: amount, rate,
      payment: loans.paymentFor(amount, rate, months),
      monthsLeft: months, label: label || t.name,
    };
    fin.loans.push(loan);
    fin.checking += amount;
    log(state, `🏦 Took a ${t.name}: ${U.money(amount)} at ${U.pct(rate)} — ${U.money(loan.payment)}/mo for ${months} months.`, 'info');
    return { ok: true, loan };
  };

  loans.payoff = function (state, loanId) {
    const fin = state.you.fin;
    const i = fin.loans.findIndex((l) => l.id === loanId);
    if (i < 0) return false;
    const l = fin.loans[i];
    if (!money.buy(state, l.principal, 'loan payoff')) return false;
    fin.loans.splice(i, 1);
    log(state, `✅ Paid off ${l.label} (${U.money(l.principal)}).`, 'good');
    return true;
  };

  // Monthly debt service. Called from the monthly tick.
  loans.tickMonth = function (state) {
    const fin = state.you.fin;
    let allPaid = true;
    for (const l of fin.loans.slice()) {
      const interest = (l.principal * l.rate) / 12;
      const principalPay = Math.min(l.principal, l.payment - interest);
      if (money.spend(state, l.payment, l.label, { noCredit: l.kind === 'mortgage' })) {
        l.principal = Math.max(0, l.principal - principalPay);
        l.monthsLeft--;
      } else {
        allPaid = false;
        l.principal += interest; // missed payment accrues
      }
      if (l.principal <= 1) {
        fin.loans.splice(fin.loans.indexOf(l), 1);
        log(state, `🎉 ${l.label} fully paid off!`, 'good');
      }
    }
    // Credit card interest + minimum payment.
    const cc = fin.creditCard;
    if (cc.balance > 1) {
      cc.balance *= 1 + 0.24 / 12;
      const minPay = Math.max(25, cc.balance * 0.03);
      if (!money.spend(state, Math.min(minPay, cc.balance), 'credit card minimum', { noCredit: true })) {
        allPaid = false;
      } else {
        cc.balance = Math.max(0, cc.balance - Math.min(minPay, cc.balance));
      }
    }
    // Credit score drift.
    if (allPaid) {
      fin.onTimeStreak++;
      const target = 700 + Math.min(120, fin.onTimeStreak * 2) - Math.min(150, St.debtTotal(state) / 4000);
      fin.creditScore += U.clamp(target - fin.creditScore, -4, 9) * 0.6 + 1;
    }
    const util = cc.balance / cc.limit;
    if (util > 0.7) fin.creditScore -= 6;
    fin.creditScore = U.clamp(fin.creditScore, 300, 850);
    // Card limit grows with trust.
    if (fin.onTimeStreak > 0 && fin.onTimeStreak % 6 === 0) {
      cc.limit = Math.min(50000, Math.round(cc.limit * 1.25));
    }
  };

  // ================================================================ career ==
  const career = (Sys.career = {});

  career.qualifies = function (state, careerId) {
    const c = D.CAREERS[careerId];
    const why = [];
    const rank = St.eduRank(state);
    let eduOk = true;
    if (c.req.rank && rank < c.req.rank) eduOk = false;
    if (c.req.tags && !c.req.tags.some((t) => St.hasEduTag(state, t))) eduOk = false;
    if (!c.req.rank && !c.req.tags) eduOk = true;
    else if (c.req.tags && c.req.rank == null) {
      // tags-only requirement already evaluated above
    }
    if (!eduOk && c.req.altSkills) {
      eduOk = Object.entries(c.req.altSkills).every(([k, v]) => St.skill(state, k) >= v);
      if (!eduOk) why.push('needs ' + Object.entries(c.req.altSkills).map(([k, v]) => `${D.SKILLS[k].name} ${v}`).join(', ') + ' (or a matching degree)');
    } else if (!eduOk) {
      if (c.req.tags) why.push('needs a matching degree (' + c.req.tags.join('/') + ')');
      else why.push('needs education rank ' + c.req.rank);
    }
    const t0 = c.tiers[0];
    const needSkills = Object.assign({}, c.req.skills || {}, t0.skills || {});
    for (const [k, v] of Object.entries(needSkills)) {
      if (St.skill(state, k) < v) { why.push(`${D.SKILLS[k].name} ${Math.round(St.skill(state, k))}/${v}`); eduOk = eduOk && false; }
    }
    return { ok: why.length === 0, why };
  };

  // Interview roll. Returns {hired, score, msg}.
  career.apply = function (state, careerId) {
    const y = state.you;
    const rng = state.rngObj;
    const q = career.qualifies(state, careerId);
    if (!q.ok) return { hired: false, msg: 'Not qualified yet: ' + q.why.join('; ') };
    y.applyCooldowns = y.applyCooldowns || {};
    if ((y.applyCooldowns[careerId] || -99) > state.t.dayIndex - 7) {
      return { hired: false, msg: 'You already interviewed here this week. Try again soon.' };
    }
    y.applyCooldowns[careerId] = state.t.dayIndex;

    const c = D.CAREERS[careerId];
    let score = 48;
    score += (St.eduRank(state) - (c.req.rank || 1)) * 6;
    score += y.yearsWorked * 3;
    score += (y.stats.happiness - 50) * 0.15 - Math.max(0, y.stats.stress - 60) * 0.2;
    score += St.skill(state, 'communication') * 0.25;
    score *= St.mod(state, 'interview');
    score -= (state.eco.unemployment - 0.045) * 250; // tight market = harder
    score += rng.range(-18, 18);

    if (score >= 55) {
      career.hire(state, careerId);
      return { hired: true, msg: `You aced the interview — hired as ${c.tiers[0].title}!` };
    }
    y.stats.stress = U.clamp(y.stats.stress + 3, 0, 100);
    return {
      hired: false,
      msg: rng.pick([
        'They went with another candidate. Keep at it.',
        '"We\'ll keep your resume on file." Ouch.',
        'Close, but no offer this time.',
      ]),
    };
  };

  career.hire = function (state, careerId) {
    const y = state.you;
    if (y.job) career.quit(state, true);
    y.job = { careerId, tier: 0, perf: 55, daysInTier: 0, raiseMult: 1, lastRaiseYear: 0 };
    log(state, `💼 Hired: ${D.CAREERS[careerId].tiers[0].title} (${D.CAREERS[careerId].name}) — ${U.money(St.salary(state))}/yr.`, 'good');
  };

  career.quit = function (state, silent) {
    const y = state.you;
    if (!y.job) return;
    const c = D.CAREERS[y.job.careerId];
    y.workHistory.push({ careerId: y.job.careerId, title: c.tiers[y.job.tier].title });
    if (!silent) log(state, `👋 You quit your job as ${c.tiers[y.job.tier].title}.`, 'info');
    y.job = null;
  };

  career.layoff = function (state, reason) {
    const y = state.you;
    if (!y.job) return;
    const c = D.CAREERS[y.job.careerId];
    y.workHistory.push({ careerId: y.job.careerId, title: c.tiers[y.job.tier].title });
    y.job = null;
    y.stats.stress = U.clamp(y.stats.stress + 18, 0, 100);
    y.stats.happiness = U.clamp(y.stats.happiness - 12, 0, 100);
    log(state, `🪓 ${reason || 'You were laid off.'}`, 'bad');
  };

  // One hour of work.
  career.workHour = function (state) {
    const y = state.you;
    const j = y.job;
    if (!j) return;
    const c = D.CAREERS[j.careerId];
    const tier = c.tiers[j.tier];
    // Wage accrual (paid out on the 1st and 15th).
    y.fin.pendingPay += St.salary(state) / (52 * c.hours);
    // Fatigue & stress scale with the career and current condition.
    const stressMul = St.mod(state, 'workStress');
    y.stats.energy = U.clamp(y.stats.energy - 3.2 * St.mod(state, 'workEnergy'), 0, 100);
    y.stats.stress = U.clamp(y.stats.stress + c.stress * 0.55 * stressMul, 0, 100);
    // On-the-job skill XP.
    for (const [sk, rate] of Object.entries(c.xp)) {
      St.gainSkill(state, sk, rate * 0.016 * St.mod(state, 'workXp'));
    }
    // Performance drifts toward a target set by condition + skill fit.
    let fit = 0, n = 0;
    for (const [sk, req] of Object.entries(tier.skills || {})) { fit += U.clamp(St.skill(state, sk) - req, -20, 25); n++; }
    const target = U.clamp(
      58 + (n ? fit / n : 8) + (y.stats.energy - 50) * 0.15 - Math.max(0, y.stats.stress - 65) * 0.3,
      5, 100) * St.mod(state, 'performance');
    j.perf += U.clamp(target - j.perf, -0.6, 0.6) * 0.08;
    j.perf = U.clamp(j.perf, 0, 100);
  };

  // Monthly review: promotions, layoffs, firings.
  career.tickMonth = function (state) {
    const y = state.you;
    const j = y.job;
    if (!j) return;
    const rng = state.rngObj;
    const c = D.CAREERS[j.careerId];
    // Promotion check.
    const next = c.tiers[j.tier + 1];
    if (next) {
      const yearsIn = j.daysInTier / 365;
      const needYears = next.years || 1;
      const skillsOk = Object.entries(next.skills || {}).every(([k, v]) => St.skill(state, k) >= v);
      if (yearsIn >= needYears && skillsOk && j.perf >= 62) {
        const p = 0.18 + (j.perf - 62) * 0.01 + (state.eco.regime === 'boom' ? 0.1 : 0);
        if (rng.chance(p)) {
          j.tier++; j.daysInTier = 0; j.perf = Math.max(50, j.perf - 8);
          y.stats.happiness = U.clamp(y.stats.happiness + 10 * St.mod(state, 'winJoy'), 0, 100);
          log(state, `🎉 Promoted to ${c.tiers[j.tier].title}! New salary: ${U.money(St.salary(state))}/yr.`, 'good');
        }
      }
    }
    // Layoffs & firings.
    const recess = state.eco.regime === 'recession';
    if (recess && rng.chance(0.022 * (state.diff.badEvents || 1))) {
      career.layoff(state, `The ${c.name.toLowerCase()} industry is cutting back — you were laid off.`);
      return;
    }
    if (j.perf < 32 && rng.chance(0.25)) {
      career.layoff(state, 'You were let go for poor performance.');
    }
  };

  // Ask for a raise (action, once per year).
  career.askRaise = function (state) {
    const y = state.you;
    const j = y.job;
    if (!j) return { ok: false, msg: 'You need a job first.' };
    if (j.lastRaiseYear === state.t.year) return { ok: false, msg: 'You already negotiated this year.' };
    j.lastRaiseYear = state.t.year;
    const rng = state.rngObj;
    const score = j.perf * 0.5 + St.skill(state, 'negotiation') * 0.5 + rng.range(-15, 15) +
      (state.eco.regime === 'boom' ? 8 : state.eco.regime === 'recession' ? -12 : 0);
    if (score > 55) {
      const bump = 0.03 + Math.min(0.06, St.skill(state, 'negotiation') / 1500);
      j.raiseMult = (j.raiseMult || 1) * (1 + bump);
      y.stats.happiness = U.clamp(y.stats.happiness + 6, 0, 100);
      log(state, `💪 Raise negotiated: +${U.pct(bump, 0)} — now ${U.money(St.salary(state))}/yr.`, 'good');
      return { ok: true, msg: `They said yes! +${U.pct(bump, 0)} salary.` };
    }
    y.stats.stress = U.clamp(y.stats.stress + 5, 0, 100);
    return { ok: false, msg: '"Not in the budget right now." Maybe after a stronger year.' };
  };

  // ============================================================= education ==
  const edu = (Sys.edu = {});

  edu.canEnroll = function (state, id) {
    const e = D.EDUCATION[id];
    const y = state.you;
    if (y.education.completed.includes(id)) return { ok: false, why: 'Already completed.' };
    if (y.education.current) return { ok: false, why: 'Already enrolled in a program.' };
    if (e.reqRank && St.eduRank(state) < e.reqRank) return { ok: false, why: 'Requires a bachelor degree first.' };
    return { ok: true };
  };

  edu.enroll = function (state, id) {
    const chk = edu.canEnroll(state, id);
    if (!chk.ok) return chk;
    state.you.education.current = { id, hours: 0 };
    log(state, `🎓 Enrolled: ${D.EDUCATION[id].name}. Put study hours in your schedule to make progress.`, 'info');
    return { ok: true };
  };

  edu.drop = function (state) {
    const cur = state.you.education.current;
    if (!cur) return;
    log(state, `🚪 Dropped out of ${D.EDUCATION[cur.id].name}.`, 'warn');
    state.you.education.current = null;
  };

  // One hour of studying (program or self-study).
  edu.studyHour = function (state) {
    const y = state.you;
    const mult = St.mod(state, 'studyXp');
    y.stats.energy = U.clamp(y.stats.energy - 2, 0, 100);
    y.stats.stress = U.clamp(y.stats.stress + 0.35, 0, 100);
    y.knowledge = U.clamp(y.knowledge + 0.02 * mult, 0, 100);
    const cur = y.education.current;
    if (cur) {
      cur.hours += 1 * mult;
      const e = D.EDUCATION[cur.id];
      if (cur.hours >= e.hours) {
        y.education.completed.push(cur.id);
        y.education.current = null;
        for (const [sk, amt] of Object.entries(e.skills)) {
          y.skills[sk] = U.clamp((y.skills[sk] || 0) + amt, 0, 100);
        }
        y.stats.happiness = U.clamp(y.stats.happiness + 12, 0, 100);
        log(state, `🎓 Graduated: ${e.name}! New careers are unlocked.`, 'good');
      }
    } else if (y.studyFocus && D.SKILLS[y.studyFocus]) {
      St.gainSkill(state, y.studyFocus, 0.05 * mult);
    }
  };

  // Tuition billed monthly while enrolled.
  edu.tickMonth = function (state) {
    const cur = state.you.education.current;
    if (!cur) return;
    const e = D.EDUCATION[cur.id];
    const bill = St.tuitionMonthly(state, e);
    if (bill > 0) money.spend(state, bill, e.name + ' tuition');
  };

  // Knowledge & unused skills decay slowly.
  edu.tickDay = function (state) {
    const y = state.you;
    y.knowledge = Math.max(0, y.knowledge - 0.004);
    const usedToday = y.skillsUsedToday || {};
    for (const id of Object.keys(y.skills)) {
      if (!usedToday[id] && y.skills[id] > 25) y.skills[id] -= 0.008;
    }
    y.skillsUsedToday = {};
  };

  // ============================================================= investing ==
  const invest = (Sys.invest = {});

  invest.buy = function (state, sym, dollars) {
    const a = state.eco.assets[sym];
    if (!a || dollars <= 0) return { ok: false, msg: 'Invalid order.' };
    if (!money.buy(state, dollars, 'investment')) return { ok: false, msg: 'Not enough cash (checking + savings).' };
    const pf = state.you.portfolio;
    const h = (pf[sym] = pf[sym] || { shares: 0, cost: 0 });
    h.shares += dollars / a.price;
    h.cost += dollars;
    return { ok: true, msg: `Bought ${U.money(dollars)} of ${sym} @ ${U.moneyExact(a.price)}.` };
  };

  invest.sell = function (state, sym, dollars) {
    const a = state.eco.assets[sym];
    const h = state.you.portfolio[sym];
    if (!a || !h || h.shares <= 0) return { ok: false, msg: 'Nothing to sell.' };
    const value = h.shares * a.price;
    dollars = Math.min(dollars, value);
    const frac = dollars / value;
    const shares = h.shares * frac;
    const basis = h.cost * frac;
    h.shares -= shares;
    h.cost -= basis;
    if (h.shares < 1e-9) delete state.you.portfolio[sym];
    state.you.fin.checking += dollars;
    state.you.fin.ytdCapGains += dollars - basis;
    return { ok: true, msg: `Sold ${U.money(dollars)} of ${sym} (${dollars - basis >= 0 ? '+' : ''}${U.money(dollars - basis)} realized).` };
  };

  // Dividends pay monthly (1/12 of annual yield).
  invest.tickMonth = function (state) {
    let div = 0;
    for (const [sym, h] of Object.entries(state.you.portfolio)) {
      const def = LL.Economy.assetDef(sym);
      const a = state.eco.assets[sym];
      if (def && def.div > 0) div += h.shares * a.price * (def.div / 12);
    }
    if (div > 0.01) {
      money.earn(state, div, 'dividends');
      state.you.fin.ytdCapGains += div;
    }
  };

  // ============================================================ real estate =
  const re = (Sys.re = {});

  re.priceOf = function (state, defId) {
    const def = D.PROPERTIES[defId];
    return def.price * state.city.homePrice * state.eco.housingIndex * state.eco.cpi;
  };

  re.buy = function (state, defId, downPct, asHome) {
    const y = state.you;
    const price = re.priceOf(state, defId);
    const down = price * downPct;
    if (y.fin.checking + y.fin.savings < down) return { ok: false, msg: 'Not enough for the down payment.' };
    let mortgageId = null;
    if (downPct < 0.999) {
      const res = loans.take(state, 'mortgage', price - down, 360, D.PROPERTIES[defId].name + ' mortgage');
      if (!res.ok) return res;
      mortgageId = res.loan.id;
      y.fin.checking -= price - down; // loan cash immediately goes to the seller
    }
    money.buy(state, down, 'down payment');
    const prop = {
      id: y.nextPropId++, defId, value: price, basis: price,
      mortgageId, isHome: !!asHome, rented: false, monthsOwned: 0,
    };
    y.properties.push(prop);
    if (asHome) re.setHome(state, prop.id);
    log(state, `🏠 Bought ${D.PROPERTIES[defId].name} for ${U.money(price)} (${U.pct(downPct, 0)} down).`, 'good');
    return { ok: true };
  };

  re.setHome = function (state, propId) {
    const y = state.you;
    for (const p of y.properties) {
      if (p.id === propId) { p.isHome = true; p.rented = false; }
      else p.isHome = false;
    }
    y.home = { kind: 'own', id: null, propId };
    log(state, `📦 You moved into your ${D.PROPERTIES[y.properties.find((p) => p.id === propId).defId].name}.`, 'info');
  };

  re.moveToRental = function (state, rentalId) {
    const y = state.you;
    for (const p of y.properties) p.isHome = false;
    y.home = { kind: 'rent', id: rentalId, propId: null };
    log(state, `📦 Moved into ${D.RENTALS[rentalId].name} (${U.money(St.rentOf(state, rentalId))}/mo).`, 'info');
  };

  re.toggleRent = function (state, propId) {
    const p = state.you.properties.find((q) => q.id === propId);
    if (!p || p.isHome) return;
    p.rented = !p.rented;
  };

  re.sell = function (state, propId) {
    const y = state.you;
    const i = y.properties.findIndex((p) => p.id === propId);
    if (i < 0) return { ok: false };
    const p = y.properties[i];
    const proceeds = p.value * 0.94; // agent fees + closing costs
    if (p.mortgageId != null) {
      const l = y.fin.loans.find((q) => q.id === p.mortgageId);
      if (l) {
        if (proceeds < l.principal) return { ok: false, msg: 'Underwater — sale wouldn\'t cover the mortgage.' };
        y.fin.loans.splice(y.fin.loans.indexOf(l), 1);
        y.fin.checking += proceeds - l.principal;
      } else y.fin.checking += proceeds;
    } else y.fin.checking += proceeds;
    y.fin.ytdCapGains += proceeds - p.basis;
    if (p.isHome) y.home = { kind: 'rent', id: 'room', propId: null };
    y.properties.splice(i, 1);
    log(state, `🏷️ Sold ${D.PROPERTIES[p.defId].name} for ${U.money(proceeds)} net.`, 'info');
    return { ok: true };
  };

  re.tickMonth = function (state) {
    const y = state.you;
    const eco = state.eco;
    const rng = state.rngObj;
    for (const p of y.properties) {
      p.monthsOwned++;
      // Value follows the housing index with idiosyncratic noise.
      p.value = Math.max(10000, p.value * (1 + (eco.lastHG || 0.002) + rng.range(-0.004, 0.004)));
      const def = D.PROPERTIES[p.defId];
      // Property tax (1.1%/yr) + maintenance (1%/yr) + HOA.
      const cost = p.value * (0.011 + 0.01) / 12 + def.hoa * eco.cpi;
      money.spend(state, cost, def.name + ' upkeep');
      if (p.rented && !p.isHome) {
        if (rng.chance(0.07)) {
          log(state, `🏚️ ${def.name} sat vacant this month — no rent collected.`, 'warn');
        } else {
          money.earn(state, p.value * def.rentYield * 0.92, 'rental income');
        }
      }
    }
  };

  // ============================================================== vehicles ==
  const veh = (Sys.veh = {});

  veh.buy = function (state, vehId, finance) {
    const y = state.you;
    const def = D.VEHICLES[vehId];
    const price = def.price * state.eco.cpi;
    const tradeIn = y.vehicleWorth || 0;
    const need = Math.max(0, price - tradeIn);
    if (finance && need > 3000) {
      const down = need * 0.2;
      if (y.fin.checking + y.fin.savings < down) return { ok: false, msg: 'Not enough for the 20% down payment.' };
      const res = loans.take(state, 'auto', need - down, 60, def.name + ' loan');
      if (!res.ok) return res;
      y.fin.checking -= need - down;
      money.buy(state, down, 'vehicle down payment');
    } else {
      if (!money.buy(state, need, 'vehicle')) return { ok: false, msg: 'Not enough cash.' };
    }
    y.vehicle = vehId;
    y.vehicleWorth = def.price > 0 ? price : 0;
    log(state, `🚗 ${def.price > 0 ? 'Bought' : 'Switched to'} ${def.name}${tradeIn > 0 ? ` (traded in for ${U.money(tradeIn)})` : ''}.`, 'info');
    return { ok: true };
  };

  veh.tickMonth = function (state) {
    const y = state.you;
    const def = D.VEHICLES[y.vehicle];
    const col = state.city.col * St.mod(state, 'expense');
    money.spend(state, (def.monthly + def.insurance) * state.eco.cpi * col, def.name + ' costs');
    if (y.vehicleWorth > 0) y.vehicleWorth *= 1 - def.dep / 12;
    if (def.breakdown && state.rngObj.chance(def.breakdown)) {
      const bill = state.rngObj.range(200, 900) * state.eco.cpi * (1 - St.skill(state, 'mechanics') / 250);
      money.spend(state, bill, 'car repair');
      log(state, `🔧 Your ${def.name} broke down — ${U.money(bill)} repair.`, 'warn');
    }
  };

  // ============================================================== business ==
  const business = (Sys.business = {});

  business.start = function (state, typeId, name) {
    const y = state.you;
    const def = D.BUSINESSES[typeId];
    const cost = def.startCost * state.eco.cpi;
    if (!money.buy(state, cost, 'business startup')) return { ok: false, msg: `Needs ${U.money(cost)} in cash.` };
    const biz = {
      id: y.nextBizId++, typeId, name: name || def.name,
      invested: cost, quality: 25 + St.skill(state, def.skill) * 0.3,
      customers: def.baseCap * 0.12, employees: 0, marketing: Math.round(def.fixed * 0.3),
      ownerHours: 0, lastProfit: 0, lastRevenue: 0, monthsOpen: 0, profitHistory: [],
    };
    y.businesses.push(biz);
    log(state, `🚀 Opened ${biz.name} (${def.name}) for ${U.money(cost)}!`, 'good');
    return { ok: true, biz };
  };

  business.hire = function (state, bizId, delta) {
    const b = state.you.businesses.find((q) => q.id === bizId);
    if (!b) return;
    b.employees = U.clamp(b.employees + delta, 0, 50);
  };

  business.setMarketing = function (state, bizId, amt) {
    const b = state.you.businesses.find((q) => q.id === bizId);
    if (b) b.marketing = U.clamp(Math.round(amt), 0, 500000);
  };

  business.valuation = function (state, b) {
    const annual = (b.profitHistory.length
      ? b.profitHistory.reduce((s, v) => s + v, 0) / b.profitHistory.length
      : b.lastProfit) * 12;
    return Math.max(b.invested * 0.35, annual * 2.8 + b.invested * 0.2);
  };

  business.sell = function (state, bizId) {
    const y = state.you;
    const i = y.businesses.findIndex((q) => q.id === bizId);
    if (i < 0) return { ok: false };
    const b = y.businesses[i];
    const price = business.valuation(state, b) * 0.92;
    y.businesses.splice(i, 1);
    money.earn(state, price, 'business sale');
    y.fin.ytdCapGains += price - b.invested;
    log(state, `💰 Sold ${b.name} for ${U.money(price)}.`, 'good');
    return { ok: true, price };
  };

  business.tickMonth = function (state) {
    const y = state.you;
    const rng = state.rngObj;
    const reg = LL.Economy.regimeInfo(state.eco);
    for (const b of y.businesses) {
      const def = D.BUSINESSES[b.typeId];
      b.monthsOpen++;
      // Quality drifts toward owner skill + hands-on hours.
      const handsOn = Math.min(1.5, b.ownerHours / 80);
      const qTarget = 20 + St.skill(state, def.skill) * 0.55 + handsOn * 25 + Math.min(15, b.employees * 1.5);
      b.quality += U.clamp(qTarget - b.quality, -4, 4);
      b.quality = U.clamp(b.quality, 5, 100);
      // Customer capacity from marketing, quality, staff & the economy.
      const mktFactor = 1 + Math.log10(1 + b.marketing / 800) * 0.55;
      const ecoFactor = reg.label === 'Boom' ? 1.15 : reg.label === 'Recession' ? 0.78 : 1;
      const cap = (def.baseCap * (0.3 + b.quality / 70) + b.employees * def.capPerEmployee) *
        mktFactor * ecoFactor * St.mod(state, 'bizRev');
      b.customers += (cap - b.customers) * 0.22 + rng.gauss() * cap * 0.04;
      b.customers = Math.max(0, b.customers);
      // P&L.
      const revenue = b.customers * def.revPer * state.eco.cpi;
      const costs = def.fixed * state.eco.cpi + b.employees * def.wage * state.eco.cpi +
        b.marketing + revenue * 0.32;
      const profit = revenue - costs;
      b.lastRevenue = revenue;
      b.lastProfit = profit;
      b.profitHistory.push(profit);
      if (b.profitHistory.length > 12) b.profitHistory.shift();
      if (profit >= 0) money.earn(state, profit, b.name);
      else money.spend(state, -profit, b.name + ' losses');
      b.ownerHours = 0;
      // Marketing is auto-paid inside costs above; nothing else to do.
    }
  };

  // ================================================================ social ==
  const social = (Sys.social = {});

  social.makeNpc = function (state, opts) {
    const rng = state.rngObj;
    opts = opts || {};
    const careers = Object.values(D.CAREERS);
    const c = rng.pick(careers);
    const tier = rng.int(0, Math.min(2, c.tiers.length - 1));
    return {
      name: rng.pick(U.FIRST_NAMES) + ' ' + rng.pick(U.LAST_NAMES),
      age: U.clamp(Math.round(state.you.ageYears + rng.range(-4, 6)), 18, 70),
      career: c.tiers[tier].title,
      income: c.tiers[tier].salary * state.city.salary,
      traits: [rng.pick(Object.keys(D.TRAITS))],
      compat: rng.int(35, 98),
      closeness: opts.closeness || 0,
      warm: rng.pick(['loves hiking', 'obsessed with coffee', 'plays in a band', 'amateur chef',
        'marathon runner', 'board-game fiend', 'reads everything', 'salsa dances', 'collects plants',
        'weekend photographer']),
    };
  };

  social.refreshSingles = function (state) {
    const y = state.you;
    while (y.singles.length < 4) y.singles.push(social.makeNpc(state));
    // Rotate one out sometimes so the pool doesn't go stale.
    if (state.rngObj.chance(0.5) && y.singles.length > 1) {
      y.singles.shift();
      y.singles.push(social.makeNpc(state));
    }
  };

  social.meetFriend = function (state) {
    const y = state.you;
    if (y.friends.length >= 6) return { ok: false, msg: 'Your circle is full — nurture the friends you have.' };
    if (y.stats.energy < 12) return { ok: false, msg: 'Too exhausted to be fun company.' };
    y.stats.energy -= 8;
    const npc = social.makeNpc(state, { closeness: 15 });
    y.friends.push(npc);
    St.gainSkill(state, 'communication', 0.5);
    log(state, `👋 You hit it off with ${npc.name} (${npc.career}, ${npc.warm}).`, 'info');
    return { ok: true, msg: `You met ${npc.name}!` };
  };

  social.hangOut = function (state, idx) {
    const y = state.you;
    const f = y.friends[idx];
    if (!f) return { ok: false };
    if (y.stats.energy < 10) return { ok: false, msg: 'Too tired tonight.' };
    y.stats.energy -= 7;
    const gain = 6 * St.mod(state, 'socialGain');
    f.closeness = U.clamp(f.closeness + gain, 0, 100);
    y.stats.happiness = U.clamp(y.stats.happiness + 3.5, 0, 100);
    y.stats.stress = U.clamp(y.stats.stress - 5, 0, 100);
    money.spend(state, 30 * state.eco.cpi, 'night out');
    return { ok: true, msg: `Great time with ${f.name}.` };
  };

  social.askOut = function (state, idx) {
    const y = state.you;
    if (y.partner) return { ok: false, msg: 'You\'re already with someone.' };
    const npc = y.singles[idx];
    if (!npc) return { ok: false };
    const rng = state.rngObj;
    const charm = St.skill(state, 'communication') * 0.4 + y.stats.happiness * 0.2 + npc.compat * 0.4;
    y.singles.splice(idx, 1);
    if (rng.range(0, 100) < charm) {
      y.partner = Object.assign(npc, { stage: 'dating', closeness: 35, monthsTogether: 0 });
      y.stats.happiness = U.clamp(y.stats.happiness + 10, 0, 100);
      log(state, `💘 You and ${npc.name} are dating!`, 'good');
      return { ok: true, msg: `${npc.name} said yes!` };
    }
    y.stats.happiness = U.clamp(y.stats.happiness - 4, 0, 100);
    return { ok: false, msg: `${npc.name} let you down gently. Their loss.` };
  };

  social.dateNight = function (state) {
    const y = state.you;
    if (!y.partner) return { ok: false };
    if (y.stats.energy < 10) return { ok: false, msg: 'Too tired — reschedule.' };
    y.stats.energy -= 8;
    money.spend(state, 85 * state.eco.cpi * state.city.col, 'date night');
    y.partner.closeness = U.clamp(y.partner.closeness + 7 * St.mod(state, 'socialGain'), 0, 100);
    y.stats.happiness = U.clamp(y.stats.happiness + 5, 0, 100);
    y.stats.stress = U.clamp(y.stats.stress - 6, 0, 100);
    return { ok: true, msg: 'A lovely evening.' };
  };

  social.propose = function (state) {
    const y = state.you;
    const p = y.partner;
    if (!p || p.stage !== 'dating') return { ok: false };
    if (p.closeness < 65) return { ok: false, msg: 'It feels too soon — build the relationship first.' };
    if (!money.buy(state, 3500 * state.eco.cpi, 'engagement ring')) return { ok: false, msg: 'Rings are expensive — you need ~' + U.money(3500 * state.eco.cpi) + '.' };
    p.stage = 'engaged';
    y.stats.happiness = U.clamp(y.stats.happiness + 15, 0, 100);
    log(state, `💍 ${p.name} said YES!`, 'good');
    return { ok: true, msg: 'Engaged!' };
  };

  social.marry = function (state, budget) {
    const y = state.you;
    const p = y.partner;
    if (!p || p.stage !== 'engaged') return { ok: false };
    const cost = budget * state.eco.cpi;
    if (!money.buy(state, cost, 'wedding')) return { ok: false, msg: 'You can\'t cover that wedding right now.' };
    p.stage = 'married';
    y.stats.happiness = U.clamp(y.stats.happiness + 20, 0, 100);
    log(state, `💒 You married ${p.name}! (${U.money(cost)} wedding)`, 'good');
    return { ok: true };
  };

  social.tryForBaby = function (state) {
    const y = state.you;
    const p = y.partner;
    if (!p || (p.stage !== 'married' && p.stage !== 'engaged')) return { ok: false, msg: 'You need a committed partner.' };
    if (y.expecting) return { ok: false, msg: 'A baby is already on the way!' };
    if (y.children.length >= 4) return { ok: false, msg: 'Four kids is plenty.' };
    y.expecting = 280; // days
    log(state, '🤰 Big news — you\'re expecting!', 'good');
    return { ok: true };
  };

  // One hour of scheduled social time.
  social.socialHour = function (state) {
    const y = state.you;
    y.stats.energy = U.clamp(y.stats.energy - 1.2, 0, 100);
    y.stats.stress = U.clamp(y.stats.stress - 0.8 * St.mod(state, 'stressRelief'), 0, 100);
    y.stats.happiness = U.clamp(y.stats.happiness + 0.12, 0, 100);
    St.gainSkill(state, 'communication', 0.02);
    (y.skillsUsedToday = y.skillsUsedToday || {}).communication = true;
    const gain = 0.5 * St.mod(state, 'socialGain');
    if (y.partner) y.partner.closeness = U.clamp(y.partner.closeness + gain, 0, 100);
    for (const f of y.friends) f.closeness = U.clamp(f.closeness + gain * 0.5, 0, 100);
  };

  social.tickMonth = function (state) {
    const y = state.you;
    const rng = state.rngObj;
    social.refreshSingles(state);
    // Relationships need tending.
    if (y.partner) {
      y.partner.monthsTogether = (y.partner.monthsTogether || 0) + 1;
      y.partner.closeness -= 4;
      if (y.partner.closeness < 18) {
        const name = y.partner.name;
        const wasMarried = y.partner.stage === 'married';
        y.partner = null;
        y.stats.happiness = U.clamp(y.stats.happiness - 18, 0, 100);
        y.stats.stress = U.clamp(y.stats.stress + 15, 0, 100);
        log(state, wasMarried
          ? `💔 ${name} filed for divorce — the neglect added up. Legal fees hurt too.`
          : `💔 ${name} broke up with you — you never had time.`, 'bad');
        if (wasMarried) money.spend(state, 12000 * state.eco.cpi, 'divorce settlement');
      } else if (y.partner.stage === 'married') {
        // Partner contributes half their income to the household.
        money.earn(state, (y.partner.income * state.eco.cpi * 0.5) / 12, 'partner income');
      }
    }
    for (const f of y.friends.slice()) {
      f.closeness -= 3;
      if (f.closeness <= 0) {
        log(state, `🍂 You and ${f.name} drifted apart.`, 'warn');
        y.friends.splice(y.friends.indexOf(f), 1);
      }
    }
    // Kids grow; cost handled in monthly bills.
    if (rng.chance(0.15) && y.children.length) {
      y.stats.happiness = U.clamp(y.stats.happiness + 3, 0, 100);
    }
  };

  // ================================================================ health ==
  const health = (Sys.health = {});

  health.exerciseHour = function (state) {
    const y = state.you;
    y.stats.energy = U.clamp(y.stats.energy - 3.5, 0, 100);
    y.stats.stress = U.clamp(y.stats.stress - 1.0 * St.mod(state, 'stressRelief'), 0, 100);
    y.stats.health = U.clamp(y.stats.health + 0.06, 0, 100);
    y.stats.happiness = U.clamp(y.stats.happiness + 0.05, 0, 100);
    St.gainSkill(state, 'fitness', 0.055);
    (y.skillsUsedToday = y.skillsUsedToday || {}).fitness = true;
  };

  health.medicalBill = function (state, base, label) {
    const cover = D.HEALTH_INSURANCE[state.you.healthIns].cover;
    const bill = base * state.eco.cpi * (1 - cover);
    money.spend(state, bill, label || 'medical bill');
    return bill;
  };

  health.doctorVisit = function (state) {
    const y = state.you;
    const bill = health.medicalBill(state, 320, 'doctor visit');
    y.stats.health = U.clamp(y.stats.health + 7, 0, 100);
    y.sick = 0;
    return { ok: true, msg: `Check-up done (${U.money(bill)}). You feel better.` };
  };

  health.therapy = function (state) {
    const y = state.you;
    const bill = health.medicalBill(state, 220, 'therapy session');
    y.stats.stress = U.clamp(y.stats.stress - 16, 0, 100);
    y.stats.happiness = U.clamp(y.stats.happiness + 4, 0, 100);
    return { ok: true, msg: `That helped (${U.money(bill)}).` };
  };

  health.tickDay = function (state) {
    const y = state.you;
    const s = y.stats;
    const diet = D.DIET[y.diet];
    // Health drift: age, diet, sleep, stress, fitness.
    let drift = -0.012 - Math.max(0, y.ageYears - 35) * 0.0016 * (state.diff.illness || 1);
    drift += diet.health;
    drift += y.sleptHours >= 7 ? 0.012 : y.sleptHours < 6 ? -0.035 : 0;
    if (s.stress > 70) drift -= 0.05;
    drift += (St.skill(state, 'fitness') / 100) * 0.03;
    if (St.hasTraitFlag(state, 'healthDrift')) drift += 0.008;
    if (y.sick) { drift -= 0.15; y.sick--; }
    s.health = U.clamp(s.health + drift, 0, 100);
    // Mood: happiness relaxes toward a setpoint shaped by life circumstances.
    let setpoint = 50 + (s.health - 60) * 0.15 - Math.max(0, s.stress - 50) * 0.25;
    if (y.partner) setpoint += y.partner.closeness * 0.08;
    setpoint += Math.min(10, y.friends.reduce((n, f) => n + f.closeness, 0) * 0.02);
    setpoint += y.children.length * 2;
    const homeQ = y.home.kind === 'rent' ? D.RENTALS[y.home.id].quality
      : (y.properties.find((p) => p.isHome) ? D.PROPERTIES[y.properties.find((p) => p.isHome).defId].quality : 0);
    setpoint += homeQ * 0.4 + D.VEHICLES[y.vehicle].quality * 0.3;
    if (y.home.kind === 'rent' && y.home.id === 'parents' && y.ageYears > 25) setpoint -= 4;
    setpoint += St.mod(state, 'moodDrift') === 1 ? 0 : 0; // (flag traits handled below)
    for (const id of y.traits) {
      const t = D.TRAITS[id];
      if (t && t.mods.moodDrift) setpoint += t.mods.moodDrift * 3;
    }
    setpoint = Math.min(setpoint, 92);
    s.happiness += U.clamp(setpoint - s.happiness, -2.5, 2.5) * 0.35;
    s.happiness = U.clamp(s.happiness, 0, 100);
    // Stress decays a little every day on its own.
    s.stress = U.clamp(s.stress - 0.8 * St.mod(state, 'stressRelief'), 0, 100);
    // Burnout & breakdown pressure.
    if (s.stress > 88 && state.rngObj.chance(0.05)) {
      s.health = U.clamp(s.health - 6, 0, 100);
      log(state, '🥵 Burnout is taking a physical toll. Slow down.', 'bad');
    }
  };

  // Annual mortality check + expecting/child aging (daily).
  health.tickDayLife = function (state) {
    const y = state.you;
    if (y.expecting != null) {
      y.expecting--;
      if (y.expecting <= 0) {
        y.expecting = null;
        const name = state.rngObj.pick(U.FIRST_NAMES);
        y.children.push({ name, ageDays: 0 });
        y.stats.happiness = U.clamp(y.stats.happiness + 18, 0, 100);
        log(state, `👶 Welcome to the world, ${name}!`, 'good');
      }
    }
    for (const c of y.children) c.ageDays++;
  };

  health.mortalityCheck = function (state) {
    const y = state.you;
    if (y.stats.health <= 0) {
      y.alive = false;
      y.deathCause = 'Your health gave out.';
      return true;
    }
    if (y.ageYears > 62) {
      const p = (y.ageYears - 62) * 0.004 * (1.4 - y.stats.health / 150) * (state.diff.illness || 1);
      if (state.rngObj.chance(Math.max(0, p))) {
        y.alive = false;
        y.deathCause = y.ageYears > 85 ? 'You died peacefully of old age.' : 'A sudden illness took you.';
        return true;
      }
    }
    return false;
  };

  // ============================================================ activities ==
  // The engine calls this once per simulated hour with the scheduled activity.
  Sys.doHour = function (state, activity) {
    const y = state.you;
    switch (activity) {
      case 'work': career.workHour(state); markUsedJobSkills(state); break;
      case 'study': edu.studyHour(state); break;
      case 'exercise': health.exerciseHour(state); break;
      case 'social': social.socialHour(state); break;
      case 'business': {
        for (const b of y.businesses) b.ownerHours += 1 / Math.max(1, y.businesses.length);
        const skills = y.businesses.map((b) => D.BUSINESSES[b.typeId].skill);
        if (skills.length) {
          St.gainSkill(state, skills[0], 0.032);
          (y.skillsUsedToday = y.skillsUsedToday || {})[skills[0]] = true;
        }
        y.stats.energy = U.clamp(y.stats.energy - 2.8, 0, 100);
        y.stats.stress = U.clamp(y.stats.stress + 0.7, 0, 100);
        break;
      }
      case 'sideHustle': {
        const h = D.SIDE_HUSTLES[y.sideHustle] || D.SIDE_HUSTLES.rideshare;
        let rate = h.base;
        if (h.needsCar && (y.vehicle === 'transit' || y.vehicle === 'bike')) rate = 8; // odd jobs instead
        if (h.skill) {
          rate += St.skill(state, h.skill) * (h.perSkill || 0.4);
          St.gainSkill(state, h.skill, 0.028);
          (y.skillsUsedToday = y.skillsUsedToday || {})[h.skill] = true;
        }
        money.earn(state, rate * state.eco.cpi, 'side hustle');
        y.fin.ytdIncome += rate * state.eco.cpi; // gig income is taxable too
        y.stats.energy = U.clamp(y.stats.energy - 2.6, 0, 100);
        y.stats.stress = U.clamp(y.stats.stress + 0.5, 0, 100);
        break;
      }
      case 'leisure':
        y.stats.energy = U.clamp(y.stats.energy - 0.4, 0, 100);
        y.stats.stress = U.clamp(y.stats.stress - 0.8 * St.mod(state, 'stressRelief'), 0, 100);
        y.stats.happiness = U.clamp(y.stats.happiness + 0.08, 0, 100);
        break;
      case 'chores':
      default:
        y.stats.energy = U.clamp(y.stats.energy - 0.8, 0, 100);
        break;
    }
  };

  function markUsedJobSkills(state) {
    const j = state.you.job;
    if (!j) return;
    const used = (state.you.skillsUsedToday = state.you.skillsUsedToday || {});
    for (const sk of Object.keys(D.CAREERS[j.careerId].xp)) used[sk] = true;
    const tier = D.CAREERS[j.careerId].tiers[j.tier];
    for (const sk of Object.keys(tier.skills || {})) used[sk] = true;
  }

  // ======================================================= monthly billing ==
  Sys.payBillsMonthly = function (state) {
    const y = state.you;
    const eco = state.eco;
    const col = state.city.col * St.mod(state, 'expense');

    // Housing.
    if (y.home.kind === 'rent') {
      const rent = St.rentOf(state, y.home.id);
      if (rent > 0) money.spend(state, rent, 'rent');
    }
    // Living costs.
    money.spend(state, D.DIET[y.diet].cost * eco.cpi * col, 'groceries');
    money.spend(state, 175 * eco.cpi * col, 'phone, internet & utilities');
    if (y.healthIns !== 'none') {
      money.spend(state, D.HEALTH_INSURANCE[y.healthIns].cost * eco.cpi, 'health insurance');
    }
    if (y.children.length) {
      money.spend(state, y.children.length * 620 * eco.cpi * col, 'kids & childcare');
    }
    // Parental support on easier difficulties.
    if (y.ageYears < y.stipendUntil && state.diff.stipend) {
      money.earn(state, state.diff.stipend * eco.cpi, 'parental support');
    }
    // Savings interest.
    if (y.fin.savings > 0) {
      y.fin.savings *= 1 + LL.Economy.savingsRate(eco) / 12;
    }
  };

  // ============================================================== paydays ===
  Sys.payday = function (state) {
    const y = state.you;
    const gross = y.fin.pendingPay;
    if (gross <= 0) return;
    y.fin.pendingPay = 0;
    const rate = St.effTaxRate(state, St.salary(state));
    const withheld = gross * rate;
    y.fin.ytdIncome += gross;
    y.fin.ytdWithheld += withheld;
    money.earn(state, gross - withheld, 'paycheck');
  };

  // ================================================================ taxes ===
  Sys.settleTaxes = function (state) {
    const y = state.you;
    const income = y.fin.ytdIncome;
    const liability = St.taxOn(state, income) + Math.max(0, y.fin.ytdCapGains) * 0.15 * state.diff.tax;
    const diff = y.fin.ytdWithheld - liability;
    y.fin.lastTax = {
      year: state.t.year - 1, income, capGains: y.fin.ytdCapGains,
      liability, withheld: y.fin.ytdWithheld, refund: diff,
    };
    if (Math.abs(diff) > 1) {
      if (diff > 0) {
        money.earn(state, diff, 'tax refund');
        log(state, `🧾 Tax season: refund of ${U.money(diff)}.`, 'good');
      } else {
        money.spend(state, -diff, 'tax bill');
        log(state, `🧾 Tax season: you owed ${U.money(-diff)}.`, 'warn');
      }
    }
    y.fin.ytdIncome = 0;
    y.fin.ytdWithheld = 0;
    y.fin.ytdCapGains = 0;
  };
})(typeof window !== 'undefined' ? window : globalThis);
