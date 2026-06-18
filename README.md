# 🕹️ EMET Arcade

A small collection of **free, original browser games** — no downloads, no
sign-up, no build step. Open the homepage, pick a game, press play. Works on
desktop and mobile.

## ▶️ Play / run it

It's a static site, so any of these work:

* **Just open it** — double-click `index.html`.
* **Serve it locally** — `python3 -m http.server`, then visit
  <http://localhost:8000>.
* **Host it** — see [Put it online for free](#-put-it-online-for-free-github-pages).

## 🎮 Games

| Game        | Type    | About                                                   |
| ----------- | ------- | ------------------------------------------------------- |
| Reel Frenzy | Arcade  | Two-phase fishing — dodge on the dive, hook on the way up |
| Snake       | Classic | Eat, grow, don't bite your tail; it speeds up as you go  |

*(More on the way.)*

## 🗂️ Project layout

```
index.html             # homepage (the arcade hub)
assets/arcade.css      # hub styling
assets/game.css        # shared frame for game pages (the "← Arcade" bar)
assets/hub.js          # the game list + homepage rendering
games/<id>/index.html  # each game lives in its own folder
fishing_game.py        # the original desktop (pygame) build of Reel Frenzy
```

## ➕ Add a game

1. Create a folder `games/<your-game>/` with an `index.html` (and its script).
   The quickest start is to **copy an existing folder** like `games/snake/`.
2. Add **one entry** to the `GAMES` list in `assets/hub.js`.

That's it — the card shows up on the homepage automatically.

## 🌐 Put it online for free (GitHub Pages)

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a
   branch**.
3. Choose your branch and the `/ (root)` folder, then **Save**.
4. After a minute it's live at `https://<your-username>.github.io/<repo>/` —
   a real link you can open anywhere and share.

## 🧪 Reel Frenzy smoke test

`game.js` doubles as a Node module and ships a headless self-test (a fake
canvas drives the full update/draw loop, no browser needed):

```bash
node games/reel-frenzy/game.js --selftest 600
```

## 🖥️ Desktop version (pygame)

The original desktop build of Reel Frenzy lives in `fishing_game.py`:

```bash
pip install -r requirements.txt   # pygame
python fishing_game.py
```

## Notes

All games are original. The art is drawn with canvas/DOM primitives and sound
effects are synthesized at runtime, so the whole site is just small static
files.
