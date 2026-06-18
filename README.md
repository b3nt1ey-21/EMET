# 🎣 Reel Frenzy

A fast, polished arcade fishing game built with **pygame**. Cast deep, dodge
the fish on the way down, then snag as many as you can on the way up — chain
catches for combo multipliers and chase a high score against a 90‑second clock.

![gameplay](docs/gameplay.png)

## The hook (literally)

The twist is the two‑phase cast:

1. **Dive** – when you cast, the hook sinks. Steer **left / right** to *dodge*
   the fish. Touching a fish (or hitting the seabed) ends your descent, so a
   clean dive reaches the deeper, more valuable water.
2. **Reel** – on the way back up, steer *into* fish to hook them. Snag several
   in a single trip and they stack into a **combo multiplier**.

Deeper, rarer species are worth far more — and the elusive **Gold Koi** is the
big payday. You have 90 seconds. Make it count.

## Run it

```bash
pip install -r requirements.txt
python fishing_game.py
```

Requires Python 3.8+.

## Controls

| Key            | Action                          |
| -------------- | ------------------------------- |
| `SPACE` / `↑`  | Cast, then start reeling early  |
| `←` / `→`      | Steer the hook                  |
| `P`            | Pause / resume                  |
| `R`            | Restart (on the game‑over screen) |
| `ESC`          | Quit                            |

## Fish & payouts

| Species     | Value | Where it swims        |
| ----------- | ----- | --------------------- |
| Sardine     | $5    | shallow               |
| Mackerel    | $10   | shallow–mid           |
| Clownfish   | $18   | mid                   |
| Bass        | $28   | mid–deep              |
| Tuna        | $55   | deep                  |
| Anglerfish  | $95   | the deepest water     |
| Gold Koi    | $150  | rare, anywhere        |

Combo bonus: `+25%` per extra fish landed in the same trip.

## Notes

* No external assets — the art is drawn with pygame primitives and the sound
  effects are synthesized procedurally at startup, so the whole game is a
  single self‑contained file.
* Your best score is saved to `highscore.txt` next to the script.
* Headless smoke test (no display/audio needed):

  ```bash
  python fishing_game.py --selftest 600
  ```
