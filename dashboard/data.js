// ============================================================
//  LIVE DATA FEED  —  Claude updates this file; the dashboard reads it.
//  Edit / extend freely. The dashboard auto-refreshes every 60s.
// ============================================================
window.DASHBOARD_DATA = {
  meta: {
    updated: "2026-07-06T18:06Z (Mon)",
    marketStatus: "OPEN — regular hours",
    account: "Agentic (#950342600)",
    owner: "Bentley",            // <- you, the admin. Edit to your name.
    role: "Administrator",
  },

  // ---- Account / goal ----
  account: {
    value: 34.69,        // PM position (~$34.39, +1.2%) + $0.30 cash
    cash: 0.30,
    buyingPower: 0.30,   // deployed into PM
    start: 36.16,        // total deposited capital (baseline for P/L)
    goal: 52.00,         // ~1.43x deposited
    goalDate: "2026-07-31",
  },

  // ---- Macro strip (refreshes at pre-open; Sun PM = futures snapshot) ----
  macro: {
    asOf: "Mon 8:33 CT — live at the open",
    items: [
      { k:"S&P",       v:"soft open", dir:-1 },
      { k:"Nasdaq",    v:"AI weak", dir:-1 },
      { k:"Dow",       v:"defensives bid", dir:1 },
      { k:"WTI Oil",   v:"~$67", dir:-1, sub:"energy soft" },
      { k:"10Y Yield", v:"~4.5%", dir:0, sub:"hawkish Fed" },
      { k:"VIX",       v:"elevated",  dir:1, sub:"choppy" },
    ],
  },

  // ---- Equity curve (account value over time) ----
  equityHistory: [
    { d:"Funded", v:36.16 },
    { d:"Jun W1", v:36.62 },
    { d:"Jun W2", v:37.06 },
    { d:"Jun 25", v:34.30 },
    { d:"Jul 6",  v:34.69 },
  ],

  // ---- Watching for entry (live triggers) ----
  watching: [
    { sym:"PM",  action:"HOLD", level:177.85, note:"NEW — bought $34 @ $182.40. Stop = daily close < 50-DMA ($177.85)." },
    { sym:"LMT", action:"WAIT", level:520.38, note:"defense catalyst but +5% in 2 days = extended; wait for pullback to 50-DMA" },
    { sym:"XOM", action:"WAIT", level:137.00, note:"energy soft on oil; wait for base + oil turn" },
  ],

  // ---- Open positions ----
  positions: [
    { sym:"PM", qty:0.186405, avg:182.40, last:184.51, cost:34.00,
      stop:177.85, plPct:1.2, note:"GREEN +1.2%. Grinding to day highs. Rotation-leader defensive; bought at open, no chase. Q2 earnings Jul 22." },
  ],

  // ---- Market bias / sentiment ----
  bias: {
    call: "DEFENSIVE",
    detail: "Rotation OUT of AI/semis (structurally weak — hawkish Fed/Warsh, valuations) INTO defensives, staples & value with real earnings. Fear & Greed ~32 (Fear), crypto ~15 (Extreme Fear). Playing the strength: consumer staples (PM) leading, defense (LMT) breaking out. Not chasing extended names; buying supported uptrends only.",
    stockFG: { value: 32, label: "Fear" },
    cryptoFG: { value: 15, label: "Extreme Fear" },
  },

  // ---- US market movement (drives the plane ✈️ + tiger 🐅 scene) ----
  market: { label: "S&P (open, soft)", changePct: -0.4 },  // + = plane climbs, tiger sprints

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
    { t: "Mon 8:33 CT", text: "✅ BOUGHT PM (Philip Morris) — 0.1864 sh @ $182.40 ($34, ~full account). THESIS: money is rotating out of weak AI/semis into defensives with real earnings; PM is a rotation leader — near highs, uptrend intact, +2.5% over its rising 50-DMA ($177.85), pays 3.25% while held. ENTRY DISCIPLINE: opened at $181.91, BELOW Thu's $182.27 close = no chasing a pump (our #1 rule). STOP: daily close < 50-DMA ($177.85, -2.5%). Honest caveat: fractional = no broker stop, only fires when I'm awake. First non-AI trade — deliberate strategy shift since AI is where we got hurt (ZETA/SMCI). Trade #4." },
    { t: "Mon 8:05 CT", text: "🔎 Deep research done. The tape is ugly for AI: hawkish Fed (Warsh), stretched semi valuations, Fear&Greed 32, crypto 15 = risk-off in growth. But money isn't leaving the market — it's ROTATING into staples/defense/value. Screened rotation leaders: PM (cleanest, +2.5% over 50DMA), LMT (best catalyst but +5% in 2 days = chase), XOM (energy soft, no). Verdict: buy PM at the open on a non-gap entry, pass on chasing LMT." },
    { t: "Thu 8:54 CT", text: "✂️ CUT both AI positions at stops: ZETA -$1.08 (-6%), SMCI -$1.24 (-6.9%). Losing round — AI/semis rolled over post-MU; buying dips in a cooling tape kept failing. MARA win (+$0.46) cushioned. Net realized -$1.86, account ~$34.30 all cash (-5.1% vs deposited). Standing down — NOT revenge-trading. Wait for genuine strength or a tape turn." },
    { t: "Tue 9:08 CT", text: "✅ BOUGHT SMCI — 0.526 sh @ $34.19 ($18). Entry = pulled back -5%, HELD its 50-DMA ($32.81), turned up = the controlled-pullback entry I waited for (not chasing Mon's rip). Stop $32.50. Now fully deployed: ZETA + SMCI (AI software + semis), ~$0.62 cash. Trade #3." },
    { t: "Tue 8:36 CT", text: "ZETA recovered to $19.83 (+3.7% green), back above its 50-DMA — raised stop to $18.76. HONEST FLAG: it closed Mon at $18.47 (below our $18.50 stop) but the stop didn't fire — session was asleep overnight, can't execute while offline (fractional = no broker stop). Worked out by luck. Buying power fully back to $18.62 (MARA settled). SMCI pulling back to $33.81 — near our ~$33 entry, watching to deploy." },
    { t: "Mon 8:59 CT", text: "✅ BOUGHT ZETA — 0.941 sh @ $19.12 ($18) on the 50-DMA reclaim (faded → reclaimed = clean entry, not a chase). Stop $18.50 (~3% risk). ~$18.62 cash left, reserved for SMCI on a pullback (still not chasing its +14% rip). Trade #2, first AI position on." },
    { t: "Mon 8:35 CT", text: "✅ SOLD MARA into the open pump @ $14.82 = +$0.46 (+3.3%) — first closed trade, a WIN. SMCI ripped +10% (no fade) so I'm NOT chasing it; waiting for a pullback to ~$32.9 to enter. ZETA faded below its line. Cash $36.62 dry, holding for a non-chasing AI entry. 9 CT gate lifted — can order anytime now." },
    { t: "Mon 7:15 CT", text: "Pre-open firmed: futures ~flat (S&P -0.1%), oil easing on US-Iran progress, VIX calm — NOT the risk-off I feared. Semis are the tailwind (MU +4%, SMCI +4.8% pre-mkt nearing its 50-DMA reclaim). Plan: observe 8:30-9:30; after 9 CT, SMCI on a 50-DMA reclaim is the top AI setup, ZETA if it holds its line. Don't chase KEEL (+12% gap). MARA green, holding." },
    { t: "Mon 5:45 CT", text: "Pre-dawn: Trump's overnight posts lean Iran de-escalation / risk-ON; couldn't get clean live futures that early. Plan holds: observe, deploy after 9 CT on confirmation." },
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
    { n:1, symbol:"MARA", status:"CLOSED", buyDate:"2026-06-18", buyPrice:14.35, shares:0.975616,
      cost:14.00, sellDate:"2026-06-22", sellPrice:14.82, proceeds:14.46, holdDays:4, term:"SHORT",
      pl:0.46, plPct:3.3, result:"WIN", taxable:0.46, taxRate:0.24, estTax:0.11, net:0.35 },
    { n:2, symbol:"ZETA", status:"CLOSED", buyDate:"2026-06-22", buyPrice:19.12, shares:0.941422,
      cost:18.00, sellDate:"2026-06-25", sellPrice:17.97, proceeds:16.92, holdDays:3, term:"SHORT",
      pl:-1.08, plPct:-6.0, result:"LOSS", taxable:0, taxRate:null, estTax:0, net:-1.08 },
    { n:3, symbol:"SMCI", status:"CLOSED", buyDate:"2026-06-23", buyPrice:34.19, shares:0.526469,
      cost:18.00, sellDate:"2026-06-25", sellPrice:31.84, proceeds:16.76, holdDays:2, term:"SHORT",
      pl:-1.24, plPct:-6.9, result:"LOSS", taxable:0, taxRate:null, estTax:0, net:-1.24 },
    { n:4, symbol:"PM", status:"OPEN", buyDate:"2026-07-06", buyPrice:182.40, shares:0.186405,
      cost:34.00, sellDate:"", sellPrice:null, proceeds:null, holdDays:0, term:"OPEN",
      pl:-0.06, plPct:-0.2, result:"OPEN", taxable:0, taxRate:null, estTax:0, net:null },
  ],
  tradeSummary: {
    realizedGains:0.46, realizedLosses:-2.32, netRealized:-1.86, netTaxable:0, estTax:0,
    wins:1, losses:2, open:1, winRate:"33%",
  },
};
