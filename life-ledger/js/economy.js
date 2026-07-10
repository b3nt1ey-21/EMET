/* Life Ledger — economy.js
 * The macro-economy: inflation, interest rates, boom/recession regimes,
 * a housing index and the daily market simulation. Everything else prices
 * off this: salaries, rents, loan rates, portfolio returns, layoff risk.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const D = LL.DATA;

  const Eco = (LL.Economy = {});

  Eco.create = function (rng, difficulty) {
    const eco = {
      cpi: 1.0,                 // cumulative price level since game start
      inflation: 0.025,         // current annual inflation rate
      fedRate: 0.035,           // policy rate; loan & savings rates derive from it
      regime: 'normal',         // 'boom' | 'normal' | 'recession'
      regimeMonths: 0,
      unemployment: 0.045,
      housingIndex: 1.0,        // multiplies property values
      assets: {},               // sym -> { price, prev, hist: [weekly closes] }
      newsFeed: [],             // recent macro headlines
    };
    for (const a of D.MARKET) {
      eco.assets[a.sym] = { price: a.price, prev: a.price, hist: [a.price], yearAgo: a.price };
    }
    if (difficulty && difficulty.startRecession) {
      eco.regime = 'recession';
      eco.unemployment = 0.08;
    }
    return eco;
  };

  Eco.assetDef = function (sym) {
    for (const a of D.MARKET) if (a.sym === sym) return a;
    return null;
  };

  // Regime-dependent adjustments applied to every asset's drift.
  const REGIME = {
    boom:      { drift: +0.06, volMul: 0.9, label: 'Boom' },
    normal:    { drift: 0,     volMul: 1.0, label: 'Steady' },
    recession: { drift: -0.16, volMul: 1.5, label: 'Recession' },
  };
  Eco.regimeInfo = (eco) => REGIME[eco.regime];

  // ------------------------------------------------------------ daily ------
  // One trading day for every asset (geometric random walk + regime drift).
  Eco.tickDay = function (state) {
    const eco = state.eco;
    const rng = state.rngObj;
    const reg = REGIME[eco.regime];
    const extraDrift = (state.diff.investDrift || 0);
    for (const a of D.MARKET) {
      const s = eco.assets[a.sym];
      const drift = (a.drift + reg.drift * (a.type === 'bond' ? 0.25 : 1) + extraDrift) / 252;
      const vol = (a.vol * (a.type === 'bond' ? 1 : reg.volMul)) / Math.sqrt(252);
      const shock = rng.gauss() * vol;
      s.prev = s.price;
      s.price = Math.max(a.type === 'crypto' ? 0.0001 : 0.5, s.price * Math.exp(drift - 0.5 * vol * vol + shock));
    }
    // Weekly close for charts (keep ~5 years of points).
    if (state.t.dayIndex % 7 === 0) {
      for (const a of D.MARKET) {
        const s = eco.assets[a.sym];
        s.hist.push(LL.U.round2(s.price));
        if (s.hist.length > 262) s.hist.shift();
        if (s.hist.length > 52) s.yearAgo = s.hist[s.hist.length - 53];
      }
    }
    // Prices creep with inflation daily.
    eco.cpi *= 1 + eco.inflation / 365;
  };

  // ----------------------------------------------------------- monthly -----
  Eco.tickMonth = function (state) {
    const eco = state.eco;
    const rng = state.rngObj;
    eco.regimeMonths++;

    // Regime transitions (simple Markov chain, difficulty skews it darker).
    const hardness = state.diff.badEvents || 1;
    let next = eco.regime;
    if (eco.regime === 'normal') {
      if (rng.chance(0.05)) next = 'boom';
      else if (rng.chance(0.035 * hardness)) next = 'recession';
    } else if (eco.regime === 'boom') {
      if (rng.chance(0.07)) next = 'normal';
      else if (rng.chance(0.02 * hardness)) next = 'recession';
    } else if (eco.regime === 'recession') {
      if (rng.chance(eco.regimeMonths > 6 ? 0.22 : 0.08)) next = 'normal';
    }
    if (next !== eco.regime) {
      eco.regime = next;
      eco.regimeMonths = 0;
      const msg = next === 'boom' ? '📈 The economy is booming! Markets rally and hiring surges.'
        : next === 'recession' ? '📉 Recession declared. Markets slump, layoffs loom, rates head down.'
        : '📊 The economy has stabilized.';
      LL.Engine.log(state, msg, next === 'recession' ? 'bad' : 'good');
      Eco.pushNews(state, msg);
    }

    // Inflation drifts by regime; fed follows with a lag.
    const infTarget = eco.regime === 'boom' ? 0.042 : eco.regime === 'recession' ? 0.012 : 0.025;
    eco.inflation += (infTarget - eco.inflation) * 0.12 + rng.range(-0.002, 0.002);
    eco.inflation = LL.U.clamp(eco.inflation, -0.005, 0.12);
    const fedTarget = LL.U.clamp(0.01 + eco.inflation * 1.1 + (eco.regime === 'recession' ? -0.02 : 0), 0.005, 0.11);
    eco.fedRate += (fedTarget - eco.fedRate) * 0.2;

    // Unemployment & housing index.
    const uTarget = eco.regime === 'boom' ? 0.034 : eco.regime === 'recession' ? 0.085 : 0.045;
    eco.unemployment += (uTarget - eco.unemployment) * 0.2 + rng.range(-0.002, 0.002);
    eco.unemployment = LL.U.clamp(eco.unemployment, 0.02, 0.2);
    const hTarget = eco.regime === 'boom' ? 0.006 : eco.regime === 'recession' ? -0.006 : 0.0028;
    eco.lastHG = hTarget + rng.range(-0.004, 0.004); // read by real-estate valuations
    eco.housingIndex = Math.max(0.4, eco.housingIndex * (1 + eco.lastHG));

    // Flavor headline once in a while.
    if (rng.chance(0.5)) Eco.pushNews(state, rng.pick(HEADLINES[eco.regime]));
  };

  const HEADLINES = {
    boom: [
      '🚀 Tech valuations hit record highs as AI adoption accelerates.',
      '🏗️ Construction can\'t keep up with demand; wages climb.',
      '💼 "Everyone is hiring" — job openings at a decade high.',
      '🛍️ Consumer spending surges for the third straight month.',
    ],
    normal: [
      '📰 Markets mixed as investors digest earnings.',
      '🏦 Central bank signals patience on interest rates.',
      '⛽ Gas prices tick up slightly ahead of summer.',
      '🌾 Supply chains normalize; shipping costs ease.',
    ],
    recession: [
      '🏚️ Housing market cools as buyers retreat.',
      '📉 Layoffs spread beyond tech into retail and logistics.',
      '🏦 Banks tighten lending standards amid defaults.',
      '🛒 Shoppers trade down to store brands as budgets strain.',
    ],
  };

  Eco.pushNews = function (state, text) {
    state.eco.newsFeed.unshift({ day: state.t.dayIndex, text });
    if (state.eco.newsFeed.length > 12) state.eco.newsFeed.pop();
  };

  // Derived rates.
  Eco.savingsRate = (eco) => Math.max(0.001, eco.fedRate - 0.015);
  Eco.loanRate = function (state, kind, credit) {
    const t = D.LOAN_TYPES[kind];
    // Better credit shaves up to 3 points off the spread.
    const creditAdj = LL.U.clamp((720 - credit) / 100, -0.5, 2) * 0.015;
    return Math.max(0.015, state.eco.fedRate + t.spread + creditAdj);
  };
})(typeof window !== 'undefined' ? window : globalThis);
