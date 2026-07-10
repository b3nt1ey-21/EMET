/* Life Ledger — ui.js
 * All DOM rendering and panel interaction. The UI reads the shared state and
 * calls into LL.Sys / LL.Engine for actions, then re-renders. It never mutates
 * simulation state directly. main.js owns the game loop and wiring; this file
 * owns what things look like.
 */
(function (G) {
  'use strict';
  const LL = (G.LL = G.LL || {});
  const { U, DATA: D, State: St, Sys, Engine: E, Economy: Eco } = LL;

  const UI = (LL.UI = {});
  let state = null;
  let active = 'overview';
  let flash = null; // transient inline message from the last action

  const $ = (sel) => document.querySelector(sel);
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  const esc = U.esc;

  const TABS = [
    ['overview', '🏠', 'Overview'],
    ['career', '💼', 'Career'],
    ['education', '🎓', 'Education'],
    ['money', '🏦', 'Money'],
    ['invest', '📈', 'Invest'],
    ['assets', '🏠', 'Assets'],
    ['business', '🚀', 'Business'],
    ['people', '❤️', 'People'],
    ['life', '🎯', 'Life'],
    ['log', '📜', 'Timeline'],
  ];

  UI.bind = function (s) { state = s; };
  UI.setActive = function (tab) { active = tab; UI.renderNav(); UI.renderPanel(); };
  UI.flash = function (msg, kind) { flash = { msg, kind: kind || 'info' }; UI.renderPanel(); };

  // ------------------------------------------------------------- top bar ---
  UI.renderTop = function () {
    const y = state.you;
    $('#dateline').textContent = U.dateStr(state.t) + ' · ' + String(state.t.hour).padStart(2, '0') + ':00';
    $('#subline').textContent = `Age ${y.ageYears} · ${state.city.name} · ${state.diff.name}`;
    $('#chip-cash').querySelector('b').textContent = U.money(y.fin.checking);
    const nw = St.netWorth(state);
    const nwEl = $('#chip-nw').querySelector('b');
    nwEl.textContent = U.money(nw);
    nwEl.className = nw >= 0 ? 'good' : 'bad';
    const reg = Eco.regimeInfo(state.eco);
    $('#chip-eco').querySelector('b').textContent = `${reg.label} · infl ${U.pct(state.eco.inflation, 1)}`;
    for (const b of document.querySelectorAll('#timectl button')) {
      b.classList.toggle('on', +b.dataset.speed === state.speed);
    }
  };

  const STAT_DEFS = [
    ['health', 'Health', '❤️', (v) => v > 60 ? 'var(--good)' : v > 30 ? 'var(--warn)' : 'var(--bad)'],
    ['energy', 'Energy', '⚡', (v) => v > 40 ? 'var(--acc)' : 'var(--warn)'],
    ['happiness', 'Happiness', '😊', (v) => v > 55 ? 'var(--good)' : v > 30 ? 'var(--warn)' : 'var(--bad)'],
    ['stress', 'Stress', '🔥', (v) => v < 40 ? 'var(--good)' : v < 70 ? 'var(--warn)' : 'var(--bad)'],
  ];
  UI.renderStats = function () {
    const bar = $('#statbar');
    bar.innerHTML = '';
    for (const [key, label, icon, color] of STAT_DEFS) {
      const v = Math.round(state.you.stats[key]);
      bar.appendChild(el(`<div class="stat">
        <div class="lbl"><span>${icon} ${label}</span><b>${v}</b></div>
        <div class="meter"><i style="width:${v}%;background:${color(v)}"></i></div>
      </div>`));
    }
  };

  // ------------------------------------------------------------- sidenav ---
  UI.renderNav = function () {
    const nav = $('#sidenav');
    nav.innerHTML = '';
    for (const [id, icon, label] of TABS) {
      const b = el(`<button class="${id === active ? 'on' : ''}"><span>${icon}</span><span>${label}</span></button>`);
      b.onclick = () => UI.setActive(id);
      nav.appendChild(b);
      if (id === 'log') nav.appendChild(el('<div class="spacer"></div>'));
    }
    const ach = el(`<button><span>🏆</span><span>Achievements</span></button>`);
    ach.onclick = () => UI.setActive('achievements');
    ach.classList.toggle('on', active === 'achievements');
    nav.appendChild(ach);
  };

  // -------------------------------------------------------------- panels ---
  UI.renderPanel = function () {
    const p = $('#panel');
    const fn = PANELS[active] || PANELS.overview;
    p.innerHTML = '';
    if (flash) {
      p.appendChild(el(`<div class="card ${flash.kind}" style="border-left:4px solid var(--${flash.kind === 'info' ? 'acc' : flash.kind});margin-bottom:12px">${esc(flash.msg)}</div>`));
      flash = null;
    }
    const grid = el('<div class="grid"></div>');
    fn(grid);
    p.appendChild(grid);
  };

  // Re-render everything currently on screen.
  UI.refresh = function () {
    UI.renderTop();
    UI.renderStats();
    UI.renderPanel();
  };

  function card(title, hint) {
    return el(`<div class="card"><h3>${title}${hint ? `<span class="hint">${hint}</span>` : ''}</h3></div>`);
  }
  function rows(pairs) {
    return pairs.map(([n, v, cls]) => `<div class="row"><span class="n">${n}</span><span class="v ${cls || ''}">${v}</span></div>`).join('');
  }
  function actBtn(label, cls, fn) {
    const b = el(`<button class="btn ${cls || ''}">${label}</button>`);
    b.onclick = () => { fn(); };
    return b;
  }

  const PANELS = {};

  // ===================================================================== OVERVIEW
  PANELS.overview = function (grid) {
    const y = state.you;
    const nw = St.netWorth(state);
    const cf = St.cashFlow(state);
    const net = cf.totalIncome - cf.totalExpenses;

    const c1 = card('Net Worth', 'peak ' + U.money(y.peakNetWorth));
    c1.appendChild(el(`<div class="big ${nw < 0 ? 'bad' : ''}">${U.money(nw)}</div>`));
    c1.appendChild(el(`<canvas class="chart" id="nwchart"></canvas>`));
    c1.classList.add('wide');
    grid.appendChild(c1);

    const c2 = card('Monthly Cash Flow');
    c2.innerHTML += rows([
      ['Income', U.money(cf.totalIncome), 'good'],
      ['Expenses', '−' + U.money(cf.totalExpenses), 'bad'],
      ['<b>Net</b>', (net >= 0 ? '+' : '') + U.money(net), net >= 0 ? 'good' : 'bad'],
    ]);
    grid.appendChild(c2);

    const c3 = card('Snapshot');
    const jobTitle = y.job ? `${D.CAREERS[y.job.careerId].icon} ${St.careerTier(state).title}` : '— unemployed —';
    c3.innerHTML += rows([
      ['Career', jobTitle],
      ['Salary', y.job ? U.money(St.salary(state)) + '/yr' : '$0'],
      ['Education', eduLabel()],
      ['Housing', homeLabel()],
      ['Credit score', Math.round(y.fin.creditScore) + creditTag()],
      ['Relationship', y.partner ? `${y.partner.name} (${y.partner.stage})` : 'single'],
    ]);
    grid.appendChild(c3);

    const c4 = card('Money At A Glance');
    c4.innerHTML += rows([
      ['Checking', U.money(y.fin.checking)],
      ['Savings', U.money(y.fin.savings)],
      ['Investments', U.money(St.portfolioValue(state))],
      ['Property', U.money(St.propertyValue(state))],
      ['Business', U.money(St.businessValue(state))],
      ['Debt', '−' + U.money(St.debtTotal(state)), 'bad'],
    ]);
    grid.appendChild(c4);

    const c5 = card('Recent Events');
    const list = y.log.slice(0, 7).map((l) => `<div class="row"><span class="n ${l.type === 'bad' ? 'bad' : l.type === 'good' ? 'good' : ''}">${esc(l.text)}</span></div>`).join('');
    c5.innerHTML += list || '<div class="sub">Nothing yet — press play.</div>';
    grid.appendChild(c5);

    const c6 = card('Headlines', Eco.regimeInfo(state.eco).label);
    c6.innerHTML += state.eco.newsFeed.slice(0, 5).map((n) => `<div class="row"><span class="n">${esc(n.text)}</span></div>`).join('') || '<div class="sub">Quiet news day.</div>';
    grid.appendChild(c6);

    requestAnimationFrame(() => drawLineChart('nwchart', y.fin.history, nw));
  };

  // ===================================================================== CAREER
  PANELS.career = function (grid) {
    const y = state.you;
    if (y.job) {
      const j = y.job;
      const c = D.CAREERS[j.careerId];
      const tier = c.tiers[j.tier];
      const cur = card('Current Job');
      cur.innerHTML += `<div class="big">${c.icon} ${tier.title}</div><div class="sub">${c.name} · Tier ${j.tier + 1}/${c.tiers.length}</div>`;
      cur.innerHTML += rows([
        ['Salary', U.money(St.salary(state)) + '/yr'],
        ['Performance', Math.round(j.perf) + '/100'],
        ['Time in role', (j.daysInTier / 365).toFixed(1) + ' yr'],
        ['Weekly hours', c.hours + 'h'],
      ]);
      const next = c.tiers[j.tier + 1];
      if (next) {
        const needs = [];
        if ((next.years || 1) > j.daysInTier / 365) needs.push(`${next.years || 1}y in role`);
        for (const [k, v] of Object.entries(next.skills || {})) if (St.skill(state, k) < v) needs.push(`${D.SKILLS[k].name} ${Math.round(St.skill(state, k))}/${v}`);
        if (j.perf < 62) needs.push('perf 62+');
        cur.innerHTML += `<div class="sub" style="margin-top:8px">Next: <b>${next.title}</b> (${U.money(next.salary * state.city.salary * state.diff.salary * state.eco.cpi)}/yr)${needs.length ? ' — need ' + needs.join(', ') : ' — <span class="good">eligible, awaiting review</span>'}</div>`;
      } else {
        cur.innerHTML += '<div class="sub good" style="margin-top:8px">You\'ve topped out this career ladder. 👑</div>';
      }
      const br = el('<div class="btnrow"></div>');
      br.appendChild(actBtn('Ask for a raise', '', () => act(() => Sys.career.askRaise(state))));
      br.appendChild(actBtn('Quit', 'danger', () => { Sys.career.quit(state); UI.refresh(); }));
      cur.appendChild(br);
      grid.appendChild(cur);
    }

    const jobs = card('Job Market', y.job ? 'switching resets your tier' : 'apply for your first job');
    for (const id of Object.keys(D.CAREERS)) {
      const c = D.CAREERS[id];
      const q = Sys.career.qualifies(state, id);
      const t0 = c.tiers[0];
      const pay = U.money(t0.salary * state.city.salary * state.diff.salary * state.eco.cpi);
      const rowE = el(`<div class="row"><span class="n">${c.icon} ${c.name} <span class="sub">· ${pay}/yr start</span></span></div>`);
      const btn = actBtn(q.ok ? 'Apply' : 'Locked', q.ok ? 'small primary' : 'small', () => {
        const r = Sys.career.apply(state, id);
        UI.flash(r.msg, r.hired ? 'good' : 'warn'); UI.refresh();
      });
      if (!q.ok) { btn.disabled = true; btn.title = q.why.join('; '); }
      rowE.appendChild(btn);
      jobs.appendChild(rowE);
    }
    grid.appendChild(jobs);

    grid.appendChild(scheduleCard());
    grid.appendChild(skillsCard());
  };

  // ===================================================================== EDUCATION
  PANELS.education = function (grid) {
    const y = state.you;
    const status = card('Your Education');
    status.innerHTML += rows([
      ['Highest level', 'Rank ' + St.eduRank(state) + ' · ' + eduLabel()],
      ['Knowledge', Math.round(y.knowledge) + '/100'],
      ['Completed', y.education.completed.length ? y.education.completed.map((id) => D.EDUCATION[id].short).join(', ') : 'High school'],
    ]);
    if (y.education.current) {
      const e = D.EDUCATION[y.education.current.id];
      const pct = Math.min(100, (y.education.current.hours / e.hours) * 100);
      status.innerHTML += `<div style="margin-top:10px"><b>${e.name}</b><div class="meter" style="margin-top:5px"><i style="width:${pct}%;background:var(--acc2)"></i></div><div class="sub">${Math.round(pct)}% · ${U.money(St.tuitionMonthly(state, e))}/mo tuition · put hours into "Study" in your schedule</div></div>`;
      status.appendChild(actBtn('Drop out', 'danger small', () => { Sys.edu.drop(state); UI.refresh(); }));
    }
    grid.appendChild(status);

    const programs = card('Enroll in a Program');
    for (const id of Object.keys(D.EDUCATION)) {
      const e = D.EDUCATION[id];
      const done = y.education.completed.includes(id);
      const chk = Sys.edu.canEnroll(state, id);
      const rowE = el(`<div class="row"><span class="n">${e.name} <span class="sub">· ${U.money(e.cost * state.eco.cpi)} · ~${Math.round(e.hours)}h${done ? ' · <span class="good">✓ done</span>' : ''}</span></span></div>`);
      if (!done) {
        const btn = actBtn(chk.ok ? 'Enroll' : '🔒', chk.ok ? 'small primary' : 'small', () => {
          const r = Sys.edu.enroll(state, id); UI.flash(r.ok ? 'Enrolled!' : r.why, r.ok ? 'good' : 'warn'); UI.refresh();
        });
        if (!chk.ok) { btn.disabled = true; btn.title = chk.why; }
        rowE.appendChild(btn);
      }
      programs.appendChild(rowE);
    }
    grid.appendChild(programs);

    const self = card('Self-Study Focus', 'uses your "Study" hours when not enrolled');
    const sel = el('<select></select>');
    sel.innerHTML = '<option value="">— none —</option>' + Object.keys(D.SKILLS).map((k) => `<option value="${k}" ${y.studyFocus === k ? 'selected' : ''}>${D.SKILLS[k].icon} ${D.SKILLS[k].name}</option>`).join('');
    sel.onchange = () => { y.studyFocus = sel.value; };
    self.appendChild(sel);
    self.appendChild(el('<div class="sub" style="margin-top:8px">When you\'re not enrolled in a program, scheduled study hours build this skill.</div>'));
    grid.appendChild(self);

    grid.appendChild(skillsCard());
  };

  // ===================================================================== MONEY
  PANELS.money = function (grid) {
    const y = state.you;
    const fin = y.fin;

    const accounts = card('Accounts');
    accounts.innerHTML += rows([
      ['Checking', U.money(fin.checking)],
      ['Savings', U.money(fin.savings) + ` <span class="sub">@ ${U.pct(Eco.savingsRate(state.eco), 1)} APY</span>`],
      ['Credit card', (fin.creditCard.balance > 0 ? '−' : '') + U.money(fin.creditCard.balance) + ` <span class="sub">/ ${U.money(fin.creditCard.limit)} limit</span>`, fin.creditCard.balance > 0 ? 'bad' : ''],
    ]);
    const xfer = el('<div class="btnrow"></div>');
    const amt = el('<input type="number" placeholder="amount" min="0" step="100">');
    xfer.appendChild(amt);
    xfer.appendChild(actBtn('→ Savings', 'small', () => { Sys.money.transfer(state, +amt.value || 0, true); UI.refresh(); }));
    xfer.appendChild(actBtn('→ Checking', 'small', () => { Sys.money.transfer(state, +amt.value || 0, false); UI.refresh(); }));
    if (fin.creditCard.balance > 0) xfer.appendChild(actBtn('Pay card', 'small primary', () => { Sys.money.payCard(state, +amt.value || fin.creditCard.balance); UI.refresh(); }));
    accounts.appendChild(xfer);
    grid.appendChild(accounts);

    const credit = card('Credit', creditRating(fin.creditScore));
    credit.innerHTML += `<div class="big">${Math.round(fin.creditScore)}</div>`;
    credit.innerHTML += `<div class="meter" style="margin:8px 0"><i style="width:${((fin.creditScore - 300) / 550) * 100}%;background:${fin.creditScore > 720 ? 'var(--good)' : fin.creditScore > 620 ? 'var(--warn)' : 'var(--bad)'}"></i></div>`;
    credit.innerHTML += rows([
      ['On-time streak', fin.onTimeStreak + ' mo'],
      ['Missed payments', String(fin.missedPayments)],
      ['Total debt', U.money(St.debtTotal(state))],
    ]);
    grid.appendChild(credit);

    // Loans
    const loans = card('Loans');
    if (fin.loans.length) {
      for (const l of fin.loans) {
        const rowE = el(`<div class="row"><span class="n">${esc(l.label)} <span class="sub">· ${U.pct(l.rate, 1)} · ${U.money(l.payment)}/mo</span></span><span class="v">${U.money(l.principal)}</span></div>`);
        rowE.appendChild(actBtn('Pay off', 'small', () => { if (!Sys.loans.payoff(state, l.id)) UI.flash('Not enough cash to pay that off.', 'warn'); UI.refresh(); }));
        loans.appendChild(rowE);
      }
    } else loans.innerHTML += '<div class="sub">No loans. Debt-free feels good.</div>';
    const takeRow = el('<div class="btnrow"></div>');
    const kindSel = el('<select></select>');
    kindSel.innerHTML = Object.entries(D.LOAN_TYPES).filter(([k]) => k !== 'auto' && k !== 'mortgage').map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    const loanAmt = el('<input type="number" placeholder="amount" min="500" step="500">');
    takeRow.appendChild(kindSel); takeRow.appendChild(loanAmt);
    takeRow.appendChild(actBtn('Borrow', 'small', () => {
      const r = Sys.loans.take(state, kindSel.value, +loanAmt.value || 0, null, null);
      UI.flash(r.ok ? 'Loan approved.' : r.msg, r.ok ? 'good' : 'warn'); UI.refresh();
    }));
    loans.appendChild(takeRow);
    grid.appendChild(loans);

    // Taxes
    const tax = card('Taxes', 'settled every January');
    if (fin.lastTax) {
      tax.innerHTML += rows([
        [`${fin.lastTax.year} income`, U.money(fin.lastTax.income)],
        ['Tax liability', U.money(fin.lastTax.liability)],
        ['Withheld', U.money(fin.lastTax.withheld)],
        [fin.lastTax.refund >= 0 ? 'Refund' : 'Owed', U.money(Math.abs(fin.lastTax.refund)), fin.lastTax.refund >= 0 ? 'good' : 'bad'],
      ]);
    } else tax.innerHTML += '<div class="sub">No tax history yet — your first filing lands next January.</div>';
    tax.innerHTML += `<div class="sub" style="margin-top:8px">Effective rate on your salary: <b>${U.pct(St.effTaxRate(state, St.salary(state)), 1)}</b></div>`;
    grid.appendChild(tax);
  };

  // ===================================================================== INVEST
  PANELS.invest = function (grid) {
    const y = state.you;
    const pv = St.portfolioValue(state);

    const hold = card('Portfolio', U.money(pv));
    if (Object.keys(y.portfolio).length) {
      let tbl = '<table><tr><th>Asset</th><th>Value</th><th>Gain</th></tr>';
      for (const [sym, h] of Object.entries(y.portfolio)) {
        const a = state.eco.assets[sym];
        const val = h.shares * a.price;
        const gain = val - h.cost;
        tbl += `<tr><td>${sym}</td><td>${U.money(val)}</td><td class="${gain >= 0 ? 'good' : 'bad'}">${gain >= 0 ? '+' : ''}${U.money(gain)}</td></tr>`;
      }
      tbl += '</table>';
      hold.innerHTML += tbl;
    } else hold.innerHTML += '<div class="sub">You own no investments yet. Buy your first below.</div>';
    grid.appendChild(hold);

    const chartCard = card('Market', Eco.regimeInfo(state.eco).label);
    chartCard.appendChild(el('<canvas class="chart" id="mktchart"></canvas>'));
    const symSel = el('<select style="margin-top:8px"></select>');
    symSel.innerHTML = D.MARKET.map((a) => `<option value="${a.sym}">${a.sym} — ${a.name}</option>`).join('');
    symSel.onchange = () => drawLineChart('mktchart', state.eco.assets[symSel.value].hist, state.eco.assets[symSel.value].price);
    chartCard.appendChild(symSel);
    chartCard.classList.add('wide');
    grid.appendChild(chartCard);
    requestAnimationFrame(() => drawLineChart('mktchart', state.eco.assets[symSel.value].hist, state.eco.assets[symSel.value].price));

    const trade = card('Trade Desk', 'buy uses checking + savings');
    let tbl = '<table><tr><th>Asset</th><th>Price</th><th>1yr</th><th></th></tr>';
    trade.appendChild(el('<div></div>'));
    const body = el('<div></div>');
    for (const a of D.MARKET) {
      const as = state.eco.assets[a.sym];
      const yr = as.yearAgo ? (as.price / as.yearAgo - 1) : 0;
      const rowE = el(`<div class="row"><span class="n">${a.sym} <span class="sub">${a.type}</span></span><span class="v">${U.moneyExact(as.price)} <span class="${yr >= 0 ? 'good' : 'bad'}">${yr >= 0 ? '+' : ''}${U.pct(yr, 0)}</span></span></div>`);
      const bwrap = el('<span></span>');
      const amtI = el('<input type="number" placeholder="$" min="0" step="100" style="width:78px">');
      bwrap.appendChild(amtI);
      bwrap.appendChild(actBtn('Buy', 'small primary', () => { const r = Sys.invest.buy(state, a.sym, +amtI.value || 0); UI.flash(r.msg, r.ok ? 'good' : 'warn'); UI.refresh(); }));
      if (y.portfolio[a.sym]) bwrap.appendChild(actBtn('Sell', 'small', () => { const r = Sys.invest.sell(state, a.sym, +amtI.value || 1e12); UI.flash(r.msg, r.ok ? 'good' : 'warn'); UI.refresh(); }));
      rowE.appendChild(bwrap);
      body.appendChild(rowE);
    }
    trade.appendChild(body);
    trade.classList.add('wide');
    grid.appendChild(trade);
  };

  // ===================================================================== ASSETS
  PANELS.assets = function (grid) {
    const y = state.you;

    const housing = card('Housing', homeLabel());
    housing.innerHTML += '<div class="sub" style="margin-bottom:6px">Rentals</div>';
    for (const id of Object.keys(D.RENTALS)) {
      const r = D.RENTALS[id];
      const isHere = y.home.kind === 'rent' && y.home.id === id;
      const rowE = el(`<div class="row"><span class="n">${r.name} <span class="sub">· ${U.money(St.rentOf(state, id))}/mo</span></span></div>`);
      rowE.appendChild(isHere ? el('<span class="tag on">living here</span>') : actBtn('Move in', 'small', () => { Sys.re.moveToRental(state, id); UI.refresh(); }));
      housing.appendChild(rowE);
    }
    grid.appendChild(housing);

    const buy = card('Buy Property', 'housing index ' + state.eco.housingIndex.toFixed(2) + '×');
    for (const id of Object.keys(D.PROPERTIES)) {
      const def = D.PROPERTIES[id];
      const price = Sys.re.priceOf(state, id);
      const rowE = el(`<div class="row"><span class="n">${def.name} <span class="sub">· ${U.money(price)}</span></span></div>`);
      const wrap = el('<span></span>');
      wrap.appendChild(actBtn('20% down', 'small primary', () => { const r = Sys.re.buy(state, id, 0.2, y.home.kind === 'rent'); UI.flash(r.ok ? 'Purchased!' : r.msg, r.ok ? 'good' : 'warn'); UI.refresh(); }));
      wrap.appendChild(actBtn('Cash', 'small', () => { const r = Sys.re.buy(state, id, 1, y.home.kind === 'rent'); UI.flash(r.ok ? 'Purchased!' : r.msg, r.ok ? 'good' : 'warn'); UI.refresh(); }));
      rowE.appendChild(wrap);
      buy.appendChild(rowE);
    }
    grid.appendChild(buy);

    if (y.properties.length) {
      const owned = card('Your Property');
      for (const p of y.properties) {
        const def = D.PROPERTIES[p.defId];
        const rowE = el(`<div class="row"><span class="n">${def.name} ${p.isHome ? '<span class="tag on">home</span>' : p.rented ? '<span class="tag good">rented</span>' : '<span class="tag">vacant</span>'}</span><span class="v">${U.money(p.value)}</span></div>`);
        const wrap = el('<span></span>');
        if (!p.isHome) {
          wrap.appendChild(actBtn(p.rented ? 'Stop renting' : 'Rent out', 'small', () => { Sys.re.toggleRent(state, p.id); UI.refresh(); }));
          wrap.appendChild(actBtn('Move in', 'small', () => { Sys.re.setHome(state, p.id); UI.refresh(); }));
        }
        wrap.appendChild(actBtn('Sell', 'small danger', () => { const r = Sys.re.sell(state, p.id); if (!r.ok && r.msg) UI.flash(r.msg, 'warn'); UI.refresh(); }));
        rowE.appendChild(wrap);
        owned.appendChild(rowE);
      }
      grid.appendChild(owned);
    }

    const veh = card('Vehicles', 'current: ' + D.VEHICLES[y.vehicle].name);
    for (const id of Object.keys(D.VEHICLES)) {
      const def = D.VEHICLES[id];
      const owned = y.vehicle === id;
      const price = def.price * state.eco.cpi;
      const rowE = el(`<div class="row"><span class="n">${def.name} <span class="sub">· ${price > 0 ? U.money(price) : 'free'} · ${U.money((def.monthly + def.insurance) * state.eco.cpi)}/mo</span></span></div>`);
      if (owned) rowE.appendChild(el('<span class="tag on">driving</span>'));
      else {
        const wrap = el('<span></span>');
        if (price > 8000) wrap.appendChild(actBtn('Finance', 'small', () => { const r = Sys.veh.buy(state, id, true); UI.flash(r.ok ? 'Done.' : r.msg, r.ok ? 'good' : 'warn'); UI.refresh(); }));
        wrap.appendChild(actBtn(price > 0 ? 'Buy' : 'Switch', 'small primary', () => { const r = Sys.veh.buy(state, id, false); UI.flash(r.ok ? 'Done.' : r.msg, r.ok ? 'good' : 'warn'); UI.refresh(); }));
        rowE.appendChild(wrap);
      }
      veh.appendChild(rowE);
    }
    grid.appendChild(veh);
  };

  // ===================================================================== BUSINESS
  PANELS.business = function (grid) {
    const y = state.you;
    if (y.businesses.length) {
      for (const b of y.businesses) {
        const def = D.BUSINESSES[b.typeId];
        const c = card(`${def.icon} ${esc(b.name)}`, def.name);
        c.innerHTML += rows([
          ['Valuation', U.money(Sys.business.valuation(state, b))],
          ['Last month profit', (b.lastProfit >= 0 ? '+' : '') + U.money(b.lastProfit), b.lastProfit >= 0 ? 'good' : 'bad'],
          ['Revenue', U.money(b.lastRevenue) + '/mo'],
          ['Customers', Math.round(b.customers).toLocaleString()],
          ['Quality', Math.round(b.quality) + '/100'],
          ['Employees', String(b.employees) + ` <span class="sub">@ ${U.money(def.wage * state.eco.cpi)}/mo</span>`],
        ]);
        const mk = el(`<div class="sched" style="margin-top:8px"><span class="n">Marketing/mo</span><input type="range" min="0" max="${Math.round(def.fixed * 6)}" step="100" value="${b.marketing}"><span class="v">${U.money(b.marketing)}</span></div>`);
        const rng = mk.querySelector('input');
        rng.oninput = () => { Sys.business.setMarketing(state, b.id, +rng.value); mk.querySelector('.v').textContent = U.money(+rng.value); };
        c.appendChild(mk);
        const br = el('<div class="btnrow"></div>');
        br.appendChild(actBtn('Hire (+1)', 'small', () => { Sys.business.hire(state, b.id, 1); UI.refresh(); }));
        br.appendChild(actBtn('Lay off (−1)', 'small', () => { Sys.business.hire(state, b.id, -1); UI.refresh(); }));
        br.appendChild(actBtn('Sell business', 'small danger', () => { const r = Sys.business.sell(state, b.id); UI.flash('Sold for ' + U.money(r.price), 'good'); UI.refresh(); }));
        c.appendChild(br);
        grid.appendChild(c);
      }
      grid.appendChild(el('<div class="card sub wide">Tip: allocate <b>Business</b> hours in your schedule (Career tab) — hands-on time raises quality and revenue.</div>'));
    }

    const start = card('Start a Business', 'costs cash up front');
    for (const id of Object.keys(D.BUSINESSES)) {
      const def = D.BUSINESSES[id];
      const rowE = el(`<div class="row"><span class="n">${def.icon} ${def.name} <span class="sub">· ${U.money(def.startCost * state.eco.cpi)} · ${D.SKILLS[def.skill].name}</span></span></div>`);
      rowE.appendChild(actBtn('Open', 'small primary', () => {
        const name = prompt(`Name your ${def.name.toLowerCase()}:`, def.name);
        if (name == null) return;
        const r = Sys.business.start(state, id, name || def.name);
        UI.flash(r.ok ? 'Business opened!' : r.msg, r.ok ? 'good' : 'warn'); UI.setActive('business');
      }));
      start.appendChild(rowE);
    }
    start.innerHTML += `<div class="sub" style="margin-top:8px">${esc(D.BUSINESSES[Object.keys(D.BUSINESSES)[0]].desc)}</div>`;
    grid.appendChild(start);
  };

  // ===================================================================== PEOPLE
  PANELS.people = function (grid) {
    const y = state.you;

    const rel = card('Relationship');
    if (y.partner) {
      const p = y.partner;
      rel.innerHTML += `<div class="big">${esc(p.name)}</div><div class="sub">${p.stage} · ${p.career} · ${p.warm}</div>`;
      rel.innerHTML += `<div class="meter" style="margin:8px 0"><i style="width:${p.closeness}%;background:var(--acc2)"></i></div><div class="sub">Closeness ${Math.round(p.closeness)}/100 · relationships fade without attention</div>`;
      const br = el('<div class="btnrow"></div>');
      br.appendChild(actBtn('Date night ($$)', '', () => act(() => Sys.social.dateNight(state))));
      if (p.stage === 'dating') br.appendChild(actBtn('💍 Propose', 'primary', () => act(() => Sys.social.propose(state))));
      if (p.stage === 'engaged') br.appendChild(actBtn('💒 Get married', 'primary', () => act(() => Sys.social.marry(state, 8000))));
      if ((p.stage === 'married' || p.stage === 'engaged') && !y.expecting) br.appendChild(actBtn('👶 Try for a baby', '', () => act(() => Sys.social.tryForBaby(state))));
      rel.appendChild(br);
    } else {
      rel.innerHTML += '<div class="sub">You\'re single. Meet someone below.</div>';
    }
    grid.appendChild(rel);

    if (!y.partner) {
      const dating = card('Dating Pool', 'refreshes monthly');
      y.singles.forEach((npc, i) => {
        const rowE = el(`<div class="row"><span class="n">${esc(npc.name)} <span class="sub">· ${npc.age}, ${npc.career} · ${npc.warm}</span></span></div>`);
        rowE.appendChild(actBtn('Ask out', 'small primary', () => { const r = Sys.social.askOut(state, i); UI.flash(r.msg, r.ok ? 'good' : 'warn'); UI.setActive('people'); }));
        dating.appendChild(rowE);
      });
      grid.appendChild(dating);
    }

    const friends = card('Friends', y.friends.length + '/6');
    if (y.friends.length) {
      y.friends.forEach((f, i) => {
        const rowE = el(`<div class="row"><span class="n">${esc(f.name)} <span class="sub">· ${f.career}</span></span><span class="v" style="width:80px"><div class="meter"><i style="width:${f.closeness}%;background:var(--good)"></i></div></span></div>`);
        rowE.appendChild(actBtn('Hang out', 'small', () => { const r = Sys.social.hangOut(state, i); if (r.msg) UI.flash(r.msg, r.ok ? 'good' : 'warn'); UI.setActive('people'); }));
        friends.appendChild(rowE);
      });
    } else friends.innerHTML += '<div class="sub">No friends yet.</div>';
    friends.appendChild(actBtn('Meet someone new', 'small primary', () => { const r = Sys.social.meetFriend(state); UI.flash(r.msg, r.ok ? 'good' : 'warn'); UI.setActive('people'); }));
    grid.appendChild(friends);

    const fam = card('Family');
    fam.innerHTML += rows([
      ['Partner', y.partner ? `${y.partner.name} (${y.partner.stage})` : 'none'],
      ['Children', y.children.length ? y.children.map((c) => `${c.name} (${Math.floor(c.ageDays / 365)})`).join(', ') : 'none'],
      ['Pet', y.pet ? `${y.pet.name} the ${y.pet.type}` : 'none'],
    ]);
    if (y.expecting) fam.innerHTML += `<div class="sub good" style="margin-top:8px">🤰 Expecting — about ${Math.ceil(y.expecting / 30)} months to go.</div>`;
    grid.appendChild(fam);
  };

  // ===================================================================== LIFE
  PANELS.life = function (grid) {
    const y = state.you;

    const health = card('Health & Wellness');
    health.innerHTML += rows([
      ['Health', Math.round(y.stats.health) + '/100'],
      ['Life expectancy', 'age ~' + Math.round(72 + (y.stats.health - 60) * 0.2 + St.skill(state, 'fitness') * 0.1)],
      ['Insurance', D.HEALTH_INSURANCE[y.healthIns].name],
    ]);
    const hb = el('<div class="btnrow"></div>');
    hb.appendChild(actBtn('See a doctor', '', () => act(() => Sys.health.doctorVisit(state))));
    hb.appendChild(actBtn('Therapy', '', () => act(() => Sys.health.therapy(state))));
    health.appendChild(hb);
    grid.appendChild(health);

    const lifestyle = card('Lifestyle');
    const dietSel = pickerRow('Diet', D.DIET, y.diet, (id) => { y.diet = id; UI.refresh(); }, (d) => `${U.money(d.cost * state.eco.cpi)}/mo`);
    lifestyle.appendChild(dietSel);
    const insSel = pickerRow('Health insurance', D.HEALTH_INSURANCE, y.healthIns, (id) => { y.healthIns = id; UI.refresh(); }, (d) => d.cost ? `${U.money(d.cost * state.eco.cpi)}/mo` : 'free');
    lifestyle.appendChild(insSel);
    const hustleSel = pickerRow('Side hustle', D.SIDE_HUSTLES, y.sideHustle, (id) => { y.sideHustle = id; UI.refresh(); }, (d) => `~${U.money(d.base * state.eco.cpi)}/hr`);
    lifestyle.appendChild(hustleSel);
    lifestyle.appendChild(el('<div class="sub" style="margin-top:8px">Add "Side hustle" hours in your schedule (Career tab) to earn on the side.</div>'));
    grid.appendChild(lifestyle);

    grid.appendChild(scheduleCard());

    const traits = card('Who You Are');
    traits.innerHTML += `<div style="margin-bottom:8px">${y.traits.map((id) => `<span class="tag on" title="${esc(D.TRAITS[id].desc)}">${D.TRAITS[id].icon} ${D.TRAITS[id].name}</span>`).join('') || '<span class="sub">No traits.</span>'}</div>`;
    traits.innerHTML += rows([
      ['Name', esc(y.name)],
      ['Age', String(y.ageYears)],
      ['City', state.city.name],
      ['Difficulty', state.diff.name],
      ['Recessions survived', String(y.recessionsSurvived)],
    ]);
    grid.appendChild(traits);
  };

  // ===================================================================== LOG
  PANELS.log = function (grid) {
    const c = card('Life Timeline', state.you.log.length + ' entries');
    c.classList.add('wide');
    c.innerHTML += state.you.log.map((l) => {
      const cal = U.calFromDayOfYear(l.doy);
      return `<div class="row"><span class="n ${l.type === 'bad' ? 'bad' : l.type === 'good' ? 'good' : l.type === 'warn' ? 'warn' : ''}">${esc(l.text)}</span><span class="v sub">${cal.monthName} ${cal.day}, ${l.y}</span></div>`;
    }).join('') || '<div class="sub">Your story starts now.</div>';
    grid.appendChild(c);
  };

  // ===================================================================== ACHIEVEMENTS
  PANELS.achievements = function (grid) {
    const y = state.you;
    const c = card('Achievements', y.achievementCount + '/' + LL.ACHIEVEMENTS.length);
    c.classList.add('wide');
    for (const a of LL.ACHIEVEMENTS) {
      const got = !!y.achievements[a.id];
      c.appendChild(el(`<div class="row"><span class="n" style="${got ? '' : 'opacity:.5'}">${got ? a.icon : '🔒'} <b>${a.name}</b> — ${esc(a.desc)}</span><span class="v">${got ? '<span class="tag good">unlocked</span>' : ''}</span></div>`));
    }
    grid.appendChild(c);
  };

  // -------------------------------------------------------- shared cards ---
  function scheduleCard() {
    const y = state.you;
    const c = card('Daily Schedule', '24h/day');
    const items = [
      ['sleep', 'Sleep 😴', 4, 12],
      ['study', 'Study 📚', 0, 12],
      ['exercise', 'Exercise 💪', 0, 6],
      ['social', 'Social 🫂', 0, 8],
      ['sideHustle', 'Side hustle 💸', 0, 10],
      ['leisure', 'Leisure 🎮', 0, 12],
    ];
    if (y.businesses.length) items.splice(4, 0, ['business', 'Business 🚀', 0, 12]);
    const workH = y.job ? Math.round(D.CAREERS[y.job.careerId].hours / 5) : 0;
    const grid2 = el('<div class="sched"></div>');
    if (workH) grid2.appendChild(el(`<span class="n">Work 💼</span><span class="sub" style="grid-column:2/4">${workH}h on weekdays (fixed by your job)</span>`));
    for (const [key, label, lo, hi] of items) {
      const val = Math.round(y.schedule[key]);
      grid2.appendChild(el(`<span class="n">${label}</span>`));
      const r = el(`<input type="range" min="${lo}" max="${hi}" value="${val}">`);
      const vspan = el(`<span class="v">${val}h</span>`);
      r.oninput = () => { y.schedule[key] = +r.value; vspan.textContent = r.value + 'h'; E.buildDayPlan(state); updateSchedSum(c); };
      grid2.appendChild(r); grid2.appendChild(vspan);
    }
    c.appendChild(grid2);
    c.appendChild(el('<div class="sub sched-sum" style="margin-top:8px"></div>'));
    updateSchedSum(c);
    return c;
  }
  function updateSchedSum(c) {
    const y = state.you;
    const workH = y.job ? Math.round(D.CAREERS[y.job.careerId].hours / 5) : 0;
    const planned = ['sleep', 'study', 'exercise', 'social', 'sideHustle', 'business', 'leisure']
      .reduce((s, k) => s + Math.round(y.schedule[k] || 0), 0) + workH;
    const free = 24 - planned;
    const sum = c.querySelector('.sched-sum');
    if (sum) sum.innerHTML = free >= 0
      ? `${planned}h planned on a workday · <b>${free}h</b> free time (rest & chores)`
      : `<span class="bad">Over-booked by ${-free}h — lower priorities get squeezed out.</span>`;
  }

  function skillsCard() {
    const c = card('Skills');
    for (const id of Object.keys(D.SKILLS)) {
      const v = Math.round(St.skill(state, id));
      c.appendChild(el(`<div class="stat" style="margin-bottom:6px"><div class="lbl"><span>${D.SKILLS[id].icon} ${D.SKILLS[id].name}</span><b>${v}</b></div><div class="meter"><i style="width:${v}%;background:var(--acc)"></i></div></div>`));
    }
    return c;
  }

  function pickerRow(label, dict, current, onPick, subFn) {
    const wrap = el(`<div style="margin-bottom:10px"><div class="sub" style="margin-bottom:4px">${label}</div></div>`);
    for (const id of Object.keys(dict)) {
      const t = el(`<span class="tag ${id === current ? 'on' : ''}" title="${esc(dict[id].desc || '')}">${esc(dict[id].name)} · ${subFn(dict[id])}</span>`);
      t.style.cursor = 'pointer';
      t.onclick = () => onPick(id);
      wrap.appendChild(t);
    }
    return wrap;
  }

  // --------------------------------------------------------- small helpers -
  function act(fn) { const r = fn(); if (r && r.msg) UI.flash(r.msg, r.ok ? 'good' : 'warn'); UI.refresh(); }
  function eduLabel() {
    const y = state.you;
    if (!y.education.completed.length) return 'High school diploma';
    const best = y.education.completed.map((id) => D.EDUCATION[id]).sort((a, b) => b.rank - a.rank)[0];
    return best.name;
  }
  function homeLabel() {
    const y = state.you;
    if (y.home.kind === 'rent') return D.RENTALS[y.home.id].name;
    const p = y.properties.find((q) => q.isHome);
    return p ? D.PROPERTIES[p.defId].name + ' (owned)' : 'homeless';
  }
  function creditRating(s) {
    return s >= 800 ? 'Exceptional' : s >= 740 ? 'Very good' : s >= 670 ? 'Good' : s >= 580 ? 'Fair' : 'Poor';
  }
  function creditTag() { return ` <span class="sub">${creditRating(state.you.fin.creditScore)}</span>`; }

  // ------------------------------------------------------------- charts ----
  // Minimal responsive line chart on a <canvas>, themed via CSS variables.
  function drawLineChart(id, data, current) {
    const cv = document.getElementById(id);
    if (!cv || !data || !data.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight || 150;
    cv.width = w * dpr; cv.height = h * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const acc = css.getPropertyValue('--acc').trim();
    const line = css.getPropertyValue('--line').trim();
    const ink2 = css.getPropertyValue('--ink2').trim();
    const series = data.slice(-160);
    let min = Math.min(...series), max = Math.max(...series);
    if (current != null) { min = Math.min(min, current); max = Math.max(max, current); }
    if (min === max) { max = min + 1; min -= 1; }
    const pad = 6, gy = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    const gx = (i) => pad + (i / (series.length - 1 || 1)) * (w - pad * 2);
    // baseline at zero if in range
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    if (min < 0 && max > 0) { ctx.beginPath(); ctx.moveTo(pad, gy(0)); ctx.lineTo(w - pad, gy(0)); ctx.stroke(); }
    // area + line
    const grad = ctx.createLinearGradient(0, pad, 0, h);
    grad.addColorStop(0, acc + '55'); grad.addColorStop(1, acc + '00');
    ctx.beginPath();
    series.forEach((v, i) => (i ? ctx.lineTo(gx(i), gy(v)) : ctx.moveTo(gx(i), gy(v))));
    ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.stroke();
    ctx.lineTo(gx(series.length - 1), h - pad); ctx.lineTo(gx(0), h - pad); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    // labels
    ctx.fillStyle = ink2; ctx.font = '10px system-ui';
    ctx.fillText(U.money(max), 4, 12);
    ctx.fillText(U.money(min), 4, h - 4);
  }
  UI.drawLineChart = drawLineChart;
})(typeof window !== 'undefined' ? window : globalThis);
