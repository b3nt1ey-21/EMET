/* Life Ledger — events.js
 * Random life events and achievements. Events are data + small functions:
 *   { id, w: weight, bad: counts as a "bad" event for difficulty scaling,
 *     cond(state) -> bool, text(state) -> string,
 *     apply(state)               — instant event, OR
 *     choices: [{ label, apply }] — pauses the game with a decision modal }
 * The engine rolls one event per day at most; choices auto-pick sensibly in
 * the headless selftest.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const D = LL.DATA;
  const U = LL.U;
  const St = LL.State;

  const money = () => LL.Sys.money;
  const clampStat = (y, k, d) => { y.stats[k] = U.clamp(y.stats[k] + d, 0, 100); };

  LL.EVENTS = [
    // ------------------------------------------------------- small change --
    { id: 'found_cash', w: 4,
      text: () => '💵 You found a $20 bill on the sidewalk.',
      apply: (s) => { money().earn(s, 20, 'found cash'); clampStat(s.you, 'happiness', 2); } },
    { id: 'phone_broke', w: 3, bad: true,
      text: () => '📱 Your phone screen shattered. Repair or replace — either way it costs.',
      apply: (s) => { money().spend(s, 180 * s.eco.cpi, 'phone repair'); clampStat(s.you, 'stress', 3); } },
    { id: 'parking_ticket', w: 3, bad: true,
      cond: (s) => s.you.vehicle !== 'transit' && s.you.vehicle !== 'bike',
      text: () => '🎫 Parking ticket. The meter maid showed no mercy.',
      apply: (s) => { money().spend(s, 65 * s.eco.cpi, 'parking ticket'); clampStat(s.you, 'stress', 2); } },
    { id: 'package_stolen', w: 2, bad: true,
      text: () => '📦 A package was stolen off your porch.',
      apply: (s) => { money().spend(s, 90 * s.eco.cpi, 'replacing stolen package'); clampStat(s.you, 'happiness', -3); } },
    { id: 'free_concert', w: 3,
      text: () => '🎶 A friend had a spare ticket — free concert night!',
      apply: (s) => { clampStat(s.you, 'happiness', 6); clampStat(s.you, 'stress', -6); } },

    // ------------------------------------------------------------- health --
    { id: 'flu', w: 2.5, bad: true,
      text: () => '🤒 You caught the flu. A few rough days ahead.',
      apply: (s) => { s.you.sick = 4; clampStat(s.you, 'energy', -25); LL.Sys.health.medicalBill(s, 120, 'flu meds'); } },
    { id: 'food_poisoning', w: 2, bad: true,
      cond: (s) => s.you.diet === 'cheap',
      text: () => '🤢 That discount sushi was a mistake. Food poisoning.',
      apply: (s) => { s.you.sick = 3; clampStat(s.you, 'energy', -20); clampStat(s.you, 'happiness', -4); } },
    { id: 'gym_injury', w: 2, bad: true,
      cond: (s) => s.you.schedule.exercise >= 2,
      text: () => '🤕 You tweaked your back at the gym. Rest up.',
      apply: (s) => { s.you.sick = 3; LL.Sys.health.medicalBill(s, 350, 'physical therapy'); } },
    { id: 'health_scare', w: 1.2, bad: true,
      cond: (s) => s.you.stats.health < 45 || s.you.ageYears > 50,
      text: () => '🏥 A health scare lands you in the ER overnight.',
      apply: (s) => {
        const bill = LL.Sys.health.medicalBill(s, 4200, 'ER visit');
        clampStat(s.you, 'health', -8); clampStat(s.you, 'stress', 10);
        LL.Engine.log(s, `The ER bill came to ${U.money(bill)}${s.you.healthIns === 'none' ? ' — being uninsured hurts' : ''}.`, 'bad');
      } },

    // --------------------------------------------------------------- work --
    { id: 'work_praise', w: 3,
      cond: (s) => !!s.you.job,
      text: () => '🌟 Your boss publicly praised your work this week.',
      apply: (s) => { s.you.job.perf = U.clamp(s.you.job.perf + 6, 0, 100); clampStat(s.you, 'happiness', 4); } },
    { id: 'office_drama', w: 3, bad: true,
      cond: (s) => !!s.you.job,
      text: () => '🙄 Office politics flared up and you got caught in the middle.',
      apply: (s) => { clampStat(s.you, 'stress', 8); s.you.job.perf = U.clamp(s.you.job.perf - 3, 0, 100); } },
    { id: 'surprise_bonus', w: 1.5,
      cond: (s) => !!s.you.job && s.you.job.perf > 65,
      text: () => '💰 Surprise performance bonus!',
      apply: (s) => {
        const amt = St.salary(s) * 0.03;
        money().earn(s, amt, 'bonus'); s.you.fin.ytdIncome += amt;
        clampStat(s.you, 'happiness', 6);
        LL.Engine.log(s, `Bonus: ${U.money(amt)}.`, 'good');
      } },
    { id: 'overtime_crunch', w: 2, bad: true,
      cond: (s) => !!s.you.job,
      text: () => '🔥 Crunch time at work — a brutal week of overtime.',
      apply: (s) => {
        clampStat(s.you, 'stress', 10); clampStat(s.you, 'energy', -15);
        const amt = St.salary(s) / 52 * 0.3;
        s.you.fin.pendingPay += amt;
      } },

    // -------------------------------------------------------------- money --
    { id: 'lottery_small', w: 1,
      text: () => '🎟️ Your scratch-off ticket actually won!',
      apply: (s) => { const amt = s.rngObj.pick([50, 100, 500]); money().earn(s, amt, 'lottery'); clampStat(s.you, 'happiness', 5); LL.Engine.log(s, `Won ${U.money(amt)}!`, 'good'); } },
    { id: 'tax_refund_error', w: 1,
      text: () => '🧾 The tax office recalculated an old return in your favor.',
      apply: (s) => { money().earn(s, 240 * s.eco.cpi, 'tax correction'); } },
    { id: 'car_accident', w: 1.6, bad: true,
      cond: (s) => !['transit', 'bike'].includes(s.you.vehicle),
      text: () => '💥 Fender bender. Nobody hurt, but the car needs work.',
      apply: (s) => {
        const bill = s.rngObj.range(600, 2400) * s.eco.cpi;
        money().spend(s, bill, 'accident repairs');
        s.you.vehicleWorth = Math.max(0, (s.you.vehicleWorth || 0) - bill * 0.5);
        clampStat(s.you, 'stress', 8);
        LL.Engine.log(s, `Repairs cost ${U.money(bill)}.`, 'bad');
      } },
    { id: 'rent_hike', w: 1.4, bad: true,
      cond: (s) => s.you.home.kind === 'rent' && s.you.home.id !== 'parents',
      text: () => '🏠 Your landlord "regrets to inform you" of a rent increase. (Rents ride the housing market.)',
      apply: (s) => { clampStat(s.you, 'stress', 5); clampStat(s.you, 'happiness', -3); } },
    { id: 'identity_theft', w: 0.3, bad: true,
      text: () => '🕵️ Someone opened a card in your name. Untangling it takes weeks.',
      apply: (s) => {
        s.you.fin.creditScore = U.clamp(s.you.fin.creditScore - 35, 300, 850);
        money().spend(s, 150 * s.eco.cpi, 'credit monitoring');
        clampStat(s.you, 'stress', 10);
      } },
    { id: 'inheritance', w: 0.35,
      cond: (s) => s.you.ageYears > 30,
      text: () => '🕊️ A great-aunt you barely knew left you an inheritance.',
      apply: (s) => {
        const amt = s.rngObj.range(8000, 40000) * s.eco.cpi;
        money().earn(s, amt, 'inheritance');
        LL.Engine.log(s, `Inheritance received: ${U.money(amt)}.`, 'good');
      } },

    // ----------------------------------------------------------- business --
    { id: 'biz_viral', w: 1.2,
      cond: (s) => s.you.businesses.length > 0,
      text: (s) => `📲 ${s.you.businesses[0].name} went viral on social media!`,
      apply: (s) => { const b = s.you.businesses[0]; b.customers *= 1.5; clampStat(s.you, 'happiness', 8); } },
    { id: 'biz_lawsuit', w: 0.9, bad: true,
      cond: (s) => s.you.businesses.length > 0 && s.you.businesses[0].monthsOpen > 6,
      text: (s) => `⚖️ ${s.you.businesses[0].name} is being sued by a disgruntled customer.`,
      choices: [
        { label: 'Settle quietly (~$8,000)', apply: (s) => { money().spend(s, 8000 * s.eco.cpi, 'legal settlement'); clampStat(s.you, 'stress', 6); } },
        { label: 'Fight it in court (risky)', apply: (s) => {
          if (s.rngObj.range(0, 100) < 40 + St.skill(s, 'negotiation')) {
            money().spend(s, 2500 * s.eco.cpi, 'legal fees');
            LL.Engine.log(s, '⚖️ Case dismissed! Only lawyer fees to pay.', 'good');
          } else {
            money().spend(s, 20000 * s.eco.cpi, 'court judgment');
            clampStat(s.you, 'stress', 12);
            LL.Engine.log(s, '⚖️ You lost the case. The judgment stings.', 'bad');
          }
        } },
      ] },
    { id: 'biz_employee_quits', w: 1.2, bad: true,
      cond: (s) => s.you.businesses.some((b) => b.employees > 0),
      text: (s) => { const b = s.you.businesses.find((x) => x.employees > 0); return `🚪 A key employee at ${b.name} quit without notice.`; },
      apply: (s) => { const b = s.you.businesses.find((x) => x.employees > 0); b.employees--; b.customers *= 0.92; clampStat(s.you, 'stress', 5); } },

    // ------------------------------------------------------------ choices --
    { id: 'scam_call', w: 2, bad: true,
      text: () => '📞 "Congratulations! You\'ve been selected for an exclusive crypto investment doubling your money in 30 days. Act now!"',
      choices: [
        { label: 'Hang up', apply: (s) => { clampStat(s.you, 'happiness', 1); LL.Engine.log(s, '📞 You hung up on an obvious scam. Wise.', 'info'); } },
        { label: 'Invest $2,000 (what could go wrong?)', apply: (s) => {
          if (St.hasTraitFlag(s, 'scamImmune')) { LL.Engine.log(s, '📞 Your inner pessimist smelled the scam instantly. You hung up.', 'info'); return; }
          money().spend(s, 2000, 'crypto "opportunity"');
          clampStat(s.you, 'stress', 8); clampStat(s.you, 'happiness', -6);
          LL.Engine.log(s, '🪤 It was a scam. The $2,000 is gone and the "broker" blocked you.', 'bad');
        } },
      ] },
    { id: 'friend_wedding', w: 1.4,
      cond: (s) => s.you.friends.length > 0,
      text: (s) => `💌 ${s.you.friends[0].name} is getting married — destination wedding invitation!`,
      choices: [
        { label: 'Attend (~$1,200, great memories)', apply: (s) => {
          money().spend(s, 1200 * s.eco.cpi, 'destination wedding');
          clampStat(s.you, 'happiness', 8); clampStat(s.you, 'stress', -5);
          if (s.you.friends[0]) s.you.friends[0].closeness = U.clamp(s.you.friends[0].closeness + 20, 0, 100);
        } },
        { label: 'Send regrets and a gift ($100)', apply: (s) => {
          money().spend(s, 100 * s.eco.cpi, 'wedding gift');
          if (s.you.friends[0]) s.you.friends[0].closeness -= 8;
        } },
      ] },
    { id: 'side_gig_offer', w: 1.2,
      cond: (s) => !!s.you.job && St.skill(s, 'programming') + St.skill(s, 'design') > 40,
      text: () => '💼 A former colleague offers you a lucrative weekend freelance contract.',
      choices: [
        { label: 'Take it (+$1,800, +stress)', apply: (s) => {
          money().earn(s, 1800 * s.eco.cpi, 'freelance contract');
          s.you.fin.ytdIncome += 1800 * s.eco.cpi;
          clampStat(s.you, 'stress', 8); clampStat(s.you, 'energy', -12);
        } },
        { label: 'Protect your weekend', apply: (s) => { clampStat(s.you, 'stress', -3); } },
      ] },
    { id: 'stray_pet', w: 0.9,
      cond: (s) => !s.you.pet,
      text: () => '🐕 A scruffy dog followed you home and is now giving you The Eyes.',
      choices: [
        { label: 'Adopt them ($60/mo, +happiness)', apply: (s) => {
          s.you.pet = { name: s.rngObj.pick(['Biscuit', 'Mochi', 'Ziggy', 'Pixel', 'Waffles']), type: 'dog' };
          LL.Engine.log(s, `🐕 ${s.you.pet.name} has adopted you right back.`, 'good');
          clampStat(s.you, 'happiness', 7);
        } },
        { label: 'Take them to a shelter', apply: (s) => { clampStat(s.you, 'happiness', -2); } },
      ] },
    { id: 'hot_tip', w: 1,
      cond: (s) => St.portfolioValueSafe(s) > 1000 || s.you.fin.checking > 5000,
      text: (s) => { const a = s.rngObj.pick(LL.DATA.MARKET.filter((m) => m.type === 'stock')); s._tipSym = a.sym; return `🤫 A guy at the gym swears ${a.name} (${a.sym}) is "about to pop off."`; },
      choices: [
        { label: 'Buy $1,000 of it', apply: (s) => {
          const sym = s._tipSym || 'HLX';
          LL.Sys.invest.buy(s, sym, Math.min(1000, s.you.fin.checking));
          LL.Engine.log(s, `You bought ${sym} on gym-guy\'s advice. Bold strategy.`, 'info');
        } },
        { label: 'Nod politely', apply: () => {} },
      ] },
  ];

  // Safe helper used by an event condition above (portfolio may be empty).
  St.portfolioValueSafe = function (s) {
    try { return St.portfolioValue(s); } catch (e) { return 0; }
  };

  // ========================================================= achievements ===
  LL.ACHIEVEMENTS = [
    { id: 'first_job', name: 'Gainfully Employed', icon: '💼', desc: 'Land your first job.',
      check: (s) => !!s.you.job || s.you.workHistory.length > 0 },
    { id: 'first_grand', name: 'Four Figures', icon: '💵', desc: 'Hold $1,000 across checking and savings.',
      check: (s) => s.you.fin.checking + s.you.fin.savings >= 1000 },
    { id: 'ten_k', name: 'Rainy-Day Fund', icon: '☔', desc: 'Save up $10,000.',
      check: (s) => s.you.fin.checking + s.you.fin.savings >= 10000 },
    { id: 'first_invest', name: 'In the Market', icon: '📈', desc: 'Make your first investment.',
      check: (s) => Object.keys(s.you.portfolio).length > 0 },
    { id: 'diversified', name: 'Diversified', icon: '🧺', desc: 'Hold 5+ different assets at once.',
      check: (s) => Object.keys(s.you.portfolio).length >= 5 },
    { id: 'degree', name: 'Cap & Gown', icon: '🎓', desc: 'Complete any degree or certification.',
      check: (s) => s.you.education.completed.length > 0 },
    { id: 'bachelor', name: 'Alma Mater', icon: '🏛️', desc: 'Earn a bachelor degree.',
      check: (s) => St.eduRank(s) >= 3 },
    { id: 'advanced_degree', name: 'Terminal Degree', icon: '📜', desc: 'Earn a master\'s or doctorate.',
      check: (s) => St.eduRank(s) >= 4 },
    { id: 'skill_100', name: 'Mastery', icon: '🥇', desc: 'Max any skill to 100.',
      check: (s) => Object.values(s.you.skills).some((v) => v >= 99.5) },
    { id: 'polymath', name: 'Polymath', icon: '🧠', desc: 'Five skills at 50+.',
      check: (s) => Object.values(s.you.skills).filter((v) => v >= 50).length >= 5 },
    { id: 'homeowner', name: 'Homeowner', icon: '🔑', desc: 'Buy a home and live in it.',
      check: (s) => s.you.properties.some((p) => p.isHome) },
    { id: 'landlord', name: 'Landlord', icon: '🏢', desc: 'Collect rent from an investment property.',
      check: (s) => s.you.properties.some((p) => p.rented) },
    { id: 'founder', name: 'Founder', icon: '🚀', desc: 'Start a business.',
      check: (s) => s.you.businesses.length > 0 },
    { id: 'tycoon', name: 'Tycoon', icon: '🏰', desc: 'Own a business worth $1M+.',
      check: (s) => s.you.businesses.some((b) => LL.Sys.business.valuation(s, b) >= 1e6) },
    { id: 'six_figures', name: 'Six Figures', icon: '💰', desc: 'Reach $100k net worth.',
      check: (s) => St.netWorth(s) >= 1e5 },
    { id: 'millionaire', name: 'Millionaire', icon: '💎', desc: 'Reach $1M net worth.',
      check: (s) => St.netWorth(s) >= 1e6 },
    { id: 'deca', name: 'Deca-Millionaire', icon: '👑', desc: 'Reach $10M net worth.',
      check: (s) => St.netWorth(s) >= 1e7 },
    { id: 'debt_free', name: 'Debt-Free', icon: '🕊️', desc: 'Carry zero debt after having at least $5k of it.',
      check: (s) => (s.you.hadBigDebt ? St.debtTotal(s) < 1 : (St.debtTotal(s) >= 5000 ? !(s.you.hadBigDebt = true) : false)) },
    { id: 'credit_800', name: 'Excellent Credit', icon: '💳', desc: 'Reach an 800 credit score.',
      check: (s) => s.you.fin.creditScore >= 800 },
    { id: 'married', name: 'I Do', icon: '💒', desc: 'Get married.',
      check: (s) => !!(s.you.partner && s.you.partner.stage === 'married') },
    { id: 'parent', name: 'Sleepless Nights', icon: '👶', desc: 'Become a parent.',
      check: (s) => s.you.children.length > 0 },
    { id: 'recession_proof', name: 'Recession-Proof', icon: '🛡️', desc: 'Come out of a recession with your net worth intact.',
      check: (s) => s.you.recessionsSurvived > 0 },
    { id: 'work_life', name: 'Balanced Books, Balanced Life', icon: '⚖️', desc: 'Hold 80+ happiness and 80+ health past age 30.',
      check: (s) => s.you.ageYears >= 30 && s.you.stats.happiness >= 80 && s.you.stats.health >= 80 },
    { id: 'retired', name: 'Financial Independence', icon: '🏖️', desc: 'Passive income covers your expenses (age 40+).',
      check: (s) => {
        if (s.you.ageYears < 40) return false;
        const cf = St.cashFlow(s);
        const passive = cf.income.filter((r) => /Rent|interest|Business|partner/i.test(r.name)).reduce((a, r) => a + r.amt, 0);
        return passive > cf.totalExpenses && cf.totalExpenses > 0;
      } },
    { id: 'senior', name: 'Golden Years', icon: '🌅', desc: 'Live to 70.',
      check: (s) => s.you.ageYears >= 70 },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
