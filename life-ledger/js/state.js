/* Life Ledger — state.js
 * Game-state construction (character creation) plus the shared helpers every
 * system uses: trait modifiers, skill XP, education rank, net worth and
 * monthly cash-flow summaries. The whole game state is one JSON-serializable
 * object; `rngObj` is rebuilt from the saved seed on load.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const D = LL.DATA;
  const U = LL.U;

  const S = (LL.State = {});

  S.VERSION = 1;

  // ------------------------------------------------------------ creation ---
  // config: { name, gender, cityId, difficulty, traits: [id, id], seed }
  S.newGame = function (config) {
    const seed = config.seed != null ? config.seed : Math.floor(Math.random() * 2 ** 31);
    const rng = U.makeRng(seed);
    const diff = D.DIFFICULTIES[config.difficulty] || D.DIFFICULTIES.normal;
    const city = D.CITIES[config.cityId] || D.CITIES.harborton;

    const state = {
      v: S.VERSION,
      seed,
      rngState: 0,
      diffId: config.difficulty || 'normal',
      cityId: config.cityId || 'harborton',
      t: {
        hour: 7, dayIndex: 0, dayOfYear: 61, dow: 0, year: 2026,
        // dayOfYear 61 = March 1 — an 18th birthday and a fresh start.
      },
      birthDoY: 61,
      startYear: 2026,
      speed: 0, // 0 paused, then hours-per-real-second set by UI

      you: {
        name: config.name || 'Alex Doe',
        gender: config.gender || 'other',
        ageYears: 18,
        alive: true,
        deathCause: null,

        stats: { health: 88, energy: 80, stress: 18, happiness: 62 },
        fitnessStreak: 0,
        sleptHours: 8,

        traits: (config.traits || []).slice(0, 3),
        skills: {},        // id -> 0..100
        knowledge: 5,      // general knowledge stat, grows from study/reading

        education: { completed: [], current: null }, // current: {id, hours, spent}
        job: null,         // { careerId, tier, perf(0..100), daysInTier, satisfaction }
        workHistory: [],   // { careerId, title, years }
        yearsWorked: 0,
        sideHustle: 'rideshare',

        schedule: { sleep: 8, study: 0, exercise: 1, social: 1, sideHustle: 0, business: 0, leisure: 3 },

        fin: {
          checking: 0, savings: 0,
          creditScore: 640, onTimeStreak: 0, missedPayments: 0,
          creditCard: { balance: 0, limit: 1500 },
          loans: [], nextLoanId: 1,
          pendingPay: 0,           // accrued wages since last payday
          ytdIncome: 0, ytdWithheld: 0, ytdCapGains: 0,
          lastTax: null,           // last year's tax summary for the UI
          history: [],             // weekly net-worth samples for the chart
          spentThisMonth: 0, earnedThisMonth: 0,
          lastMonthSpent: 0, lastMonthEarned: 0,
        },

        portfolio: {},     // sym -> { shares, cost } (cost = total cost basis)
        home: { kind: 'rent', id: 'parents', propId: null },
        properties: [],    // { id, defId, value, mortgageId, isHome, rented, monthsOwned }
        nextPropId: 1,
        vehicle: 'transit',
        diet: 'standard',
        healthIns: 'none',

        businesses: [],    // see business system
        nextBizId: 1,

        partner: null,     // npc object + { stage, closeness, sharedFinances }
        friends: [],       // npc objects with closeness
        singles: [],       // dating pool, refreshed monthly
        children: [],      // { name, ageDays }

        log: [],           // life timeline (capped)
        achievements: {},
        achievementCount: 0,
        eventsSeen: 0,
        stipendUntil: diff.stipendUntil || 0,
        peakNetWorth: 0,
        recessionsSurvived: 0,
      },

      eco: null,
      pendingEvent: null,  // { id, title, text, labels[] } while a choice modal is open
      gameOver: null,
    };

    // Base skills with a small random spread, plus trait-flavored bumps.
    for (const id of Object.keys(D.SKILLS)) state.you.skills[id] = rng.int(1, 6);
    state.you.skills.communication += rng.int(0, 6);
    state.you.skills.fitness += rng.int(0, 8);

    state.you.fin.checking = diff.startCash;
    state.eco = LL.Economy.create(rng, diff);
    state.rngState = rng.state;

    return state;
  };

  // Rebind the live RNG after load / creation. Call before simulating.
  S.attachRng = function (state) {
    const rng = U.makeRng(state.seed);
    rng.state = state.rngState || rng.state;
    Object.defineProperty(state, 'rngObj', {
      value: rng, enumerable: false, configurable: true,
    });
    Object.defineProperty(state, 'diff', {
      get() { return D.DIFFICULTIES[state.diffId]; },
      enumerable: false, configurable: true,
    });
    Object.defineProperty(state, 'city', {
      get() { return D.CITIES[state.cityId]; },
      enumerable: false, configurable: true,
    });
    return state;
  };

  S.serialize = function (state) {
    state.rngState = state.rngObj ? state.rngObj.state : state.rngState;
    return JSON.stringify(state);
  };
  S.deserialize = function (json) {
    const state = JSON.parse(json);
    return S.attachRng(state);
  };

  // ---------------------------------------------------------------- mods ---
  // Multiplicative trait modifier: product over the player's traits.
  S.mod = function (state, key) {
    let m = 1;
    for (const id of state.you.traits) {
      const t = D.TRAITS[id];
      if (t && t.mods[key] != null) m *= t.mods[key];
    }
    return m;
  };
  S.hasTraitFlag = function (state, key) {
    for (const id of state.you.traits) {
      const t = D.TRAITS[id];
      if (t && t.mods[key]) return true;
    }
    return false;
  };

  // -------------------------------------------------------------- skills ---
  const TECH_SKILLS = { programming: 1, investing: 1, mechanics: 1 };
  const CREATIVE_SKILLS = { design: 1, marketing: 1, cooking: 1 };

  // Diminishing returns: gains shrink as the skill approaches 100.
  S.gainSkill = function (state, id, base) {
    const y = state.you;
    if (y.skills[id] == null) return 0;
    let mult = S.mod(state, 'skillXp');
    if (TECH_SKILLS[id]) mult *= S.mod(state, 'techXp');
    if (CREATIVE_SKILLS[id]) mult *= S.mod(state, 'creativeXp');
    // Mood helps a little; exhaustion hurts a lot.
    mult *= 0.75 + (y.stats.happiness / 100) * 0.4;
    if (y.stats.energy < 15) mult *= 0.4;
    const gain = base * mult * (1 - y.skills[id] / 115);
    y.skills[id] = U.clamp(y.skills[id] + gain, 0, 100);
    return gain;
  };

  S.skill = (state, id) => state.you.skills[id] || 0;

  // ----------------------------------------------------------- education ---
  S.eduRank = function (state) {
    let rank = 1; // everyone starts with a high-school diploma at 18
    for (const id of state.you.education.completed) {
      const e = D.EDUCATION[id];
      if (e && e.rank > rank) rank = e.rank;
    }
    return rank;
  };
  S.hasEduTag = function (state, tag) {
    for (const id of state.you.education.completed) {
      const e = D.EDUCATION[id];
      if (e && e.tag === tag) return true;
    }
    return false;
  };

  // ------------------------------------------------------------- careers ---
  S.careerTier = function (state) {
    const j = state.you.job;
    if (!j) return null;
    return D.CAREERS[j.careerId].tiers[j.tier];
  };
  // Current gross annual salary (city + difficulty + inflation adjusted).
  S.salary = function (state) {
    const j = state.you.job;
    if (!j) return 0;
    const tier = D.CAREERS[j.careerId].tiers[j.tier];
    return tier.salary * state.city.salary * state.diff.salary *
      state.eco.cpi * S.mod(state, 'salary') * (j.raiseMult || 1);
  };

  // ------------------------------------------------------------- finance ---
  S.portfolioValue = function (state) {
    let v = 0;
    for (const sym of Object.keys(state.you.portfolio)) {
      const h = state.you.portfolio[sym];
      const a = state.eco.assets[sym];
      if (h && a) v += h.shares * a.price;
    }
    return v;
  };
  S.propertyValue = function (state) {
    let v = 0;
    for (const p of state.you.properties) v += p.value;
    return v;
  };
  S.businessValue = function (state) {
    let v = 0;
    for (const b of state.you.businesses) v += LL.Sys.business.valuation(state, b);
    return v;
  };
  S.debtTotal = function (state) {
    let d = state.you.fin.creditCard.balance;
    for (const l of state.you.fin.loans) d += l.principal;
    return d;
  };
  S.netWorth = function (state) {
    const y = state.you;
    return y.fin.checking + y.fin.savings + S.portfolioValue(state) +
      S.propertyValue(state) + (y.vehicleWorth || 0) + S.businessValue(state) -
      S.debtTotal(state);
  };

  // Monthly recurring cash flow snapshot (for dashboards, not the sim itself).
  S.cashFlow = function (state) {
    const y = state.you;
    const eco = state.eco;
    const out = { income: [], expenses: [] };
    const push = (arr, name, amt) => { if (Math.abs(amt) >= 0.5) arr.push({ name, amt }); };

    if (y.job) push(out.income, S.careerTier(state).title, S.salary(state) / 12);
    if (y.partner && y.partner.stage === 'married') {
      push(out.income, `${y.partner.name} (partner income share)`, y.partner.income * 0.5 / 12);
    }
    if (y.ageYears < state.you.stipendUntil) push(out.income, 'Parental support', state.diff.stipend);
    for (const p of y.properties) {
      if (p.rented && !p.isHome) push(out.income, `Rent: ${D.PROPERTIES[p.defId].name}`, p.value * D.PROPERTIES[p.defId].rentYield * 0.92);
    }
    let bizProfit = 0;
    for (const b of y.businesses) bizProfit += b.lastProfit || 0;
    push(out.income, 'Business profit (last mo.)', bizProfit);
    push(out.income, 'Savings interest', y.fin.savings * LL.Economy.savingsRate(eco) / 12);

    const col = state.city.col * S.mod(state, 'expense');
    if (y.home.kind === 'rent') {
      push(out.expenses, D.RENTALS[y.home.id].name + ' (rent)', S.rentOf(state, y.home.id));
    }
    for (const p of y.properties) {
      const def = D.PROPERTIES[p.defId];
      push(out.expenses, `${def.name}: tax+upkeep${def.hoa ? '+HOA' : ''}`,
        p.value * (0.011 + 0.01) / 12 + def.hoa * eco.cpi);
    }
    for (const l of y.fin.loans) push(out.expenses, D.LOAN_TYPES[l.kind].name, l.payment);
    if (y.fin.creditCard.balance > 1) push(out.expenses, 'Credit card (min payment)', Math.max(25, y.fin.creditCard.balance * 0.03));
    const vdef = D.VEHICLES[y.vehicle];
    push(out.expenses, vdef.name + ' (running costs)', (vdef.monthly + vdef.insurance) * eco.cpi * col);
    push(out.expenses, D.DIET[y.diet].name, D.DIET[y.diet].cost * eco.cpi * col);
    push(out.expenses, 'Phone, internet & utilities', 175 * eco.cpi * col);
    if (y.healthIns !== 'none') push(out.expenses, D.HEALTH_INSURANCE[y.healthIns].name, D.HEALTH_INSURANCE[y.healthIns].cost * eco.cpi);
    if (y.education.current) {
      const e = D.EDUCATION[y.education.current.id];
      push(out.expenses, e.name + ' (tuition)', S.tuitionMonthly(state, e));
    }
    push(out.expenses, 'Kids', y.children.length * 620 * eco.cpi * col);

    out.totalIncome = out.income.reduce((s, r) => s + r.amt, 0);
    out.totalExpenses = out.expenses.reduce((s, r) => s + r.amt, 0);
    return out;
  };

  S.rentOf = function (state, rentalId) {
    const r = D.RENTALS[rentalId];
    return r.rent * state.city.rent * state.diff.rent * state.eco.cpi * S.mod(state, 'expense');
  };
  // Tuition spread over the program's nominal length (assumes ~4h study/day).
  S.tuitionMonthly = function (state, eduDef) {
    const months = Math.max(3, Math.round(eduDef.hours / 4 / 30));
    return (eduDef.cost / months) * state.eco.cpi;
  };

  // Simplified progressive federal brackets + flat city/state tax.
  S.taxOn = function (state, income) {
    const brackets = [
      [11000, 0.10], [45000, 0.12], [100000, 0.22], [190000, 0.24],
      [240000, 0.32], [600000, 0.35], [Infinity, 0.37],
    ];
    const deduction = 14000 * state.eco.cpi;
    let taxable = Math.max(0, income - deduction);
    let tax = 0, prev = 0;
    for (const [cap, rate] of brackets) {
      const capAdj = cap === Infinity ? Infinity : cap * state.eco.cpi;
      if (taxable > prev) tax += (Math.min(taxable, capAdj) - prev) * rate;
      if (taxable <= capAdj) break;
      prev = capAdj;
    }
    tax += income * 0.0765;                       // payroll
    tax += Math.max(0, income - deduction) * state.city.stateTax; // state
    return tax * state.diff.tax;
  };
  S.effTaxRate = function (state, income) {
    return income > 0 ? S.taxOn(state, income) / income : 0;
  };
})(typeof window !== 'undefined' ? window : globalThis);
