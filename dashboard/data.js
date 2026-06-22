// ============================================================
//  LIVE DATA FEED  —  Claude updates this file; the dashboard reads it.
//  Edit / extend freely. The dashboard auto-refreshes every 60s.
// ============================================================
window.DASHBOARD_DATA = {
  meta: {
    updated: "2026-06-22T10:45Z (Mon pre-open)",
    marketStatus: "CLOSED — funded +$22; reopens Mon 8:30 AM CT",
    account: "Agentic (#950342600)",
    owner: "Bentley",            // <- you, the admin. Edit to your name.
    role: "Administrator",
  },

  // ---- Account / goal ----
  account: {
    value: 36.13,        // MARA position + cash, after +$22 deposit
    cash: 22.16,
    start: 36.16,        // total deposited capital (baseline for P/L)
    goal: 52.00,         // ~1.43x deposited
    goalDate: "2026-07-31",
  },

  // ---- Macro strip (refreshes at pre-open; Sun PM = futures snapshot) ----
  macro: {
    asOf: "Sun-eve snapshot — refresh at 7:30 CT",
    items: [
      { k:"S&P fut",   v:"-0.4%", dir:-1, sub:"stale" },
      { k:"Nasdaq fut",v:"-0.6%", dir:-1, sub:"stale" },
      { k:"Dow fut",   v:"-0.3%", dir:-1, sub:"stale" },
      { k:"WTI Oil",   v:"$78", dir:-1, sub:"Hormuz open?" },
      { k:"10Y Yield", v:"4.46%", dir:0 },
      { k:"VIX",       v:"16.4",  dir:0, sub:"calm" },
    ],
  },

  // ---- Equity curve (account value over time) ----
  equityHistory: [
    { d:"Funded", v:36.16 },
    { d:"Now",    v:36.13 },
  ],

  // ---- Watching for entry (live triggers) ----
  watching: [
    { sym:"ZETA", action:"BUY",  level:18.76, note:"AI software · at rising 50-DMA (cleanest)" },
    { sym:"SMCI", action:"BUY",  level:32.81, note:"AI semis · reclaim 50-DMA (SOXX tailwind)" },
    { sym:"APLD", action:"BUY",  level:39.56, note:"AI data center · buy pullback to 50-DMA" },
    { sym:"QBTS", action:"BUY",  level:22.49, note:"quantum/AI compute · buy pullback to 50-DMA" },
    { sym:"MARA", action:"SELL", level:12.63, note:"break of 50-DMA = exit (stop)" },
  ],

  // ---- Open positions ----
  positions: [
    { symbol: "MARA", shares: 0.975616, cost: 14.35, last: 14.32,
      stop: 12.63, note: "~Breakeven. With fresh cash I can add a new setup without selling this." },
  ],

  // ---- Market bias / sentiment ----
  bias: {
    call: "CAUTIOUS",
    detail: "Cross-currents: Sun-eve futures were red on oil, but Trump's overnight posts (Iran 'done', Hormuz OPEN, oil gushing) lean risk-ON & oil-bearish. VIX calm ~16. Firm read at 7:30 CT scan.",
    stockFG: { value: 37, label: "Fear" },
    cryptoFG: { value: 25, label: "Extreme Fear" },
  },

  // ---- US market movement (drives the plane ✈️ + tiger 🐅 scene) ----
  market: { label: "S&P futures (Mon open)", changePct: -0.4 },  // + = plane climbs, tiger sprints

  // ---- Main sectors / themes in play (heat: hot | warm | cold) ----
  sectors: [
    { name:"AI Data Centers & Power", icon:"🏢", heat:"hot",  tickers:["KEEL","APLD","TSSI","SLNH"], note:"The next-bull-run thesis — compute + electricity for AI." },
    { name:"Semiconductors / AI Hardware", icon:"💻", heat:"hot", tickers:["SMCI","APLD"], note:"SOXX +8% Friday; Micron (MU) earnings this week." },
    { name:"Quantum Computing", icon:"⚛️", heat:"warm", tickers:["QBTS"], note:"Real catalysts (CHIPS Act, $35 PT) but extended / hype-driven." },
    { name:"Bitcoin Miners / Crypto", icon:"₿", heat:"cold", tickers:["MARA","HIVE","SLNH","COIN"], note:"Crypto in Extreme Fear, BTC < $70k — headwind." },
    { name:"Solar / Renewable Energy", icon:"☀️", heat:"warm", tickers:["TE"], note:"TE profitable + KORE deal; rate/tariff sensitive." },
    { name:"Space & Satellites", icon:"🛰️", heat:"warm", tickers:["SPCX","ASTS","LUNR","RDW","SPCE"], note:"SpaceX (SPCX) hot IPO; ASTS pulled back." },
    { name:"Drones / Defense Autonomy", icon:"🚁", heat:"warm", tickers:["RCAT","ONDS"], note:"Autonomous systems theme." },
    { name:"AI Software", icon:"🤖", heat:"warm", tickers:["NOW","ZETA","BBAI","TEAM"], note:"Mixed; rate-sensitive into a hawkish Fed." },
    { name:"Biotech / Gene Editing", icon:"🧪", heat:"warm", tickers:["CRSP"], note:"CRISPR maturing; binary catalysts." },
  ],

  // ---- LIVE THOUGHT PROCESS (newest first) ----
  thoughts: [
    { t: "Mon 5:45 CT", text: "Pre-dawn read: Trump's overnight posts lean Iran de-escalation / risk-ON (Hormuz OPEN, 'oil gushing' = oil-bearish), softening Sun-eve's risk-off. VIX calm ~16. Couldn't get clean live futures this early — firm macro read at 7:30 CT. Plan holds: observe 8:30-9:30, deploy $22 into AI-theme setups after 9 CT on confirmation." },
    { t: "Sun PM", text: "Focus narrowed to AI / power / data-center / semis: ZETA, SMCI, APLD, KEEL, QBTS. Dropping medical/biotech (CRSP) from candidates for now. Cash deploys into AI-theme setups Monday after 9 CT." },
    { t: "Sun PM", text: "+$22 deposit in — cash now $22.16, goal rescaled to $52. Big unlock: Monday I can BUY a clean AI-theme setup WITHOUT selling MARA. Deploy per the framework on a confirmed entry after 9 CT — measured, given the risk-off open." },
    { t: "Sun 21:05Z", text: "Futures RED (ES -0.4%, NQ -0.6%, oil +3% on Iran/Lebanon). Monday looks risk-off — flips the earlier risk-on lean. Plan: stay defensive, observe 8:30-9:30, don't chase, MARA likely opens soft." },
    { t: "Sun 17:15Z", text: "Weekend — markets closed, nothing actionable. All monitors armed for Mon open." },
    { t: "Sun 16:10Z", text: "MARA is the weak link into Monday. Willing to rotate it into a confirmed 50-DMA setup on a risk-on open, or cut it if it breaks $12.63." },
    { t: "Sun 15:40Z", text: "Cleanest setups: ZETA / NOK / CRSP sitting right on rising 50-DMAs = tightest stops, best risk/reward." },
    { t: "Sun 14:30Z", text: "Crypto F&G in Extreme Fear (BTC < $70k) — direct headwind for MARA. Reinforces rotating out." },
    { t: "Sun 13:00Z", text: "Cash constraint: only $0.16 free. Any new buy requires selling MARA first until account is funded." },
  ],

  // ---- Plan / trading clock ----
  plan: {
    title: "Monday Game Plan",
    steps: [
      "7:30 CT — pre-open scan (news, Trump, F&G, futures, refresh 50-DMAs)",
      "8:30–9:30 CT — OBSERVE, set daily bias. No trading.",
      "9:00 CT — hard line: earliest any trade",
      "9:00–11:00 CT — act only on a confirmed setup. No pressure; not trading is valid.",
      "11:30 + 15:30 CT — midday & post-close re-scans",
    ],
  },

  // ---- Watchlist: 50-DMA scan ----
  // status: entry | pullback | extended | downtrend | hold
  watchlist: [
    { s:"ZETA", p:18.90, ma:18.76, st:"entry",     note:"on rising 50-DMA" },
    { s:"NOK",  p:13.49, ma:13.17, st:"entry",     note:"on rising 50-DMA" },
    { s:"CRSP", p:54.09, ma:52.75, st:"entry",     note:"on rising 50-DMA" },
    { s:"TEAM", p:82.72, ma:83.66, st:"pullback",  note:"pullback to rising line" },
    { s:"RDW",  p:14.35, ma:13.76, st:"hold",      note:"rising +4%" },
    { s:"SPCE", p:3.56,  ma:3.37,  st:"hold",      note:"rising +6%" },
    { s:"TTWO", p:239.28,ma:219.86,st:"extended",  note:"+9%" },
    { s:"QBTS", p:24.69, ma:22.49, st:"extended",  note:"+10%" },
    { s:"MARA", p:14.22, ma:12.63, st:"hold",      note:"HELD — stop $12.63" },
    { s:"SLNH", p:1.72,  ma:1.52,  st:"extended",  note:"+13% (dilution risk)" },
    { s:"APLD", p:46.59, ma:39.56, st:"extended",  note:"+18% (semis tailwind)" },
    { s:"SPCX", p:185.00,ma:153.64,st:"extended",  note:"+20% (fresh IPO)" },
    { s:"PBLS", p:25.85, ma:21.05, st:"extended",  note:"+23%" },
    { s:"TE",   p:9.35,  ma:7.14,  st:"extended",  note:"+31%" },
    { s:"HIVE", p:4.26,  ma:3.23,  st:"extended",  note:"+32%" },
    { s:"KEEL", p:6.29,  ma:4.26,  st:"extended",  note:"+48%" },
    { s:"SMCI", p:30.66, ma:32.81, st:"pullback",  note:"below rising MA (semis tailwind)" },
    { s:"BBAI", p:3.92,  ma:4.10,  st:"pullback",  note:"below, rising" },
    { s:"TSSI", p:13.56, ma:13.67, st:"downtrend", note:"at falling MA" },
    { s:"RCAT", p:11.44, ma:11.63, st:"downtrend", note:"below, falling" },
    { s:"NOW",  p:95.04, ma:99.24, st:"downtrend", note:"-4%" },
    { s:"ONDS", p:9.27,  ma:10.16, st:"downtrend", note:"-9%" },
    { s:"ASTS", p:80.66, ma:88.42, st:"downtrend", note:"-9%" },
    { s:"BYND", p:0.71,  ma:0.81,  st:"downtrend", note:"-12%" },
    { s:"COIN", p:163.26,ma:185.20,st:"downtrend", note:"-12%" },
    { s:"NIO",  p:5.02,  ma:5.91,  st:"downtrend", note:"-15%" },
    { s:"SIDU", p:3.23,  ma:4.04,  st:"downtrend", note:"-20%" },
    { s:"LUNR", p:22.85, ma:29.69, st:"downtrend", note:"broken -23%" },
    { s:"ALIT", p:0.57,  ma:0.75,  st:"downtrend", note:"broken -24%" },
  ],

  // ---- Alerts feed (news / Trump / triggers) ----
  alerts: [
    { t:"Sun PM", tag:"DEPOSIT", text:"+$22 funded → $22.16 cash ready to deploy Monday; goal raised to $52." },
    { t:"Sun PM", tag:"FUTURES", text:"S&P -0.4%, Nasdaq -0.6%, oil +3% — Monday set to open soft / risk-off." },
    { t:"Sun", tag:"NEWS", text:"Iran/Lebanon: Trump warning revived geopolitical risk (offsets the peace deal)." },
    { t:"Sun", tag:"FED",  text:"Hawkish dot plot (possible hikes) + hot inflation → headwind for speculative small-caps." },
    { t:"Sun", tag:"SECTOR", text:"Semis ripped Fri (SOXX +8%); Micron earnings this week → SMCI / APLD tailwind." },
  ],

  // ---- Monitors ----
  monitors: [
    { name:"Watchlist heartbeat", id:"bo6d2q29w", status:"armed" },
    { name:"Trump real-time (mkt hrs)", id:"be000m06c", status:"armed" },
  ],

  // ---- Tax assumptions (edit to your bracket) ----
  tax: { shortRate: 0.24, longRate: 0.15, note: "Short-term taxed as ordinary income; long-term >1yr at 15%; losses untaxed." },

  // ---- Trade log / spreadsheet (every trade, win or lose) ----
  // result: OPEN | WIN | LOSS ; term: SHORT | LONG | OPEN
  trades: [
    { n:1, symbol:"MARA", status:"OPEN", buyDate:"2026-06-18", buyPrice:14.35, shares:0.975616,
      cost:14.00, sellDate:"", sellPrice:null, proceeds:null, holdDays:null, term:"OPEN",
      pl:-0.13, plPct:-0.9, result:"OPEN", taxable:0, taxRate:null, estTax:0, net:null },
  ],
  tradeSummary: {
    realizedGains:0, realizedLosses:0, netRealized:0, netTaxable:0, estTax:0,
    wins:0, losses:0, open:1, winRate:"—",
  },
};
