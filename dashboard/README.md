# 🤖 Claude Trading Desk — Live Dashboard

A self-contained dashboard that surfaces Claude's live trading state and thought process.

## Open it
Just open `index.html` in any browser (double-click it). No server needed.

## How it works
- **`index.html`** — the UI (HTML/CSS/JS, all in one file). Auto-refreshes every 60s.
- **`data.js`** — the live data. Claude updates this with positions, signals, the
  50-DMA scan, market bias, Fear & Greed, and the running **thought-process feed**.
  When Claude commits an update and you reload, the dashboard shows the latest.

## Panels
- **Account & Goal** — value + progress bar toward $20 by Jul 31
- **Market Bias** — risk-on/off call + Stock & Crypto Fear-and-Greed gauges
- **Open Positions** — live P/L + stops
- **🧠 Live Thought Process** — timestamped feed of Claude's reasoning/decisions
- **Plan / Clock** — the daily trading timeline + alerts
- **Watchlist** — 50-DMA scan, color-coded by setup (entry / pullback / extended / downtrend)
- **Monitors & Rules** — what's armed + the hard rules

## Customize / add stuff
Everything is data-driven from `data.js` — add fields there and render them in
`index.html`. Ideas to bolt on: realized P/L chart, a trade-history panel (read
`../trading_log.csv`), a Trump-alert feed, per-name sparklines, dark/light toggle.
Tell Claude what you want and it'll wire it in.
