# Roblox Pickleball — prototype

A playable 1v1 pickleball prototype: court with kitchen lines, net, paddle
tool, ball physics, and side-out scoring (first to 11, win by 2).

## Files -> what to create in Studio

Rojo's naming convention tells you the instance type. If you're pasting
manually (no Rojo), use this mapping:

| File                          | Create in Studio as    | Parent                          |
| ----------------------------- | ----------------------- | -------------------------------- |
| `CourtBuilder.lua`            | ModuleScript `CourtBuilder` | `ServerScriptService/Pickleball` |
| `GameManager.lua`             | ModuleScript `GameManager`  | `ServerScriptService/Pickleball` |
| `PaddleServer.lua`            | ModuleScript `PaddleServer` | `ServerScriptService/Pickleball` |
| `Main.server.lua`             | **Script** `Main`           | `ServerScriptService/Pickleball` |
| `Config.lua`                  | ModuleScript `Config`      | `ReplicatedStorage/Pickleball`  |
| `Remotes.lua`                 | ModuleScript `Remotes`     | `ReplicatedStorage/Pickleball`  |
| `ScoreboardGui.client.lua`    | **LocalScript** `ScoreboardGui` | `StarterGui/Pickleball`     |

So: make a folder named `Pickleball` inside `ServerScriptService`, put the
three ModuleScripts + one Script in it. Make a folder named `Pickleball`
inside `ReplicatedStorage` with the two ModuleScripts. Make a folder named
`Pickleball` inside `StarterGui` with the one LocalScript.

## Manual import (copy/paste)

1. In Studio's Explorer, right-click `ServerScriptService` -> Insert Object ->
   Folder, name it `Pickleball`.
2. Right-click that folder -> Insert Object -> Script, rename to `Main`,
   delete the default contents, paste in `Main.server.lua`.
3. Repeat for `CourtBuilder`, `GameManager`, `PaddleServer` but insert them
   as **ModuleScript**, not Script.
4. Do the same under `ReplicatedStorage` (folder `Pickleball`, two
   ModuleScripts: `Config`, `Remotes`).
5. Do the same under `StarterGui` (folder `Pickleball`, one **LocalScript**:
   `ScoreboardGui`).
6. Press Play (or Play Solo). The court, net, ball, and your paddle should
   appear; the scoreboard shows top-center.

## Rojo import (recommended once set up)

1. Install the Rojo Studio plugin and the `rojo` CLI on your machine.
2. From this `roblox-pickleball/` folder, run `rojo serve`.
3. In Studio, open the Rojo plugin panel and click Connect.
4. Everything under `src/` syncs in automatically, live, as you edit files
   here.

## How the game works

- Two Teams are created automatically (`Team A`, `Team B`); players are
  balanced onto them as they join and get a paddle Tool on spawn.
- Swinging is automatic on paddle-to-ball contact (no button needed) — walk
  up to the ball with the paddle equipped and it gets hit toward the
  opponent's side, angled slightly by where you're facing.
- Scoring is real side-out rules: only the serving team scores points; if
  the receiving team wins a rally, serve just passes to them with no point.
  A ball that nets, goes out of bounds, bounces twice, or bounces on the
  hitter's own side ends the rally.
- First to 11 points, win by 2, resets the match automatically.

## Known simplifications (good next steps)

- No enforced "two-bounce rule" nuance (serve must bounce before either
  side volleys) or kitchen (non-volley zone) foot-fault detection yet —
  the kitchen is currently just painted, not enforced.
- Singles only; no doubles positioning logic.
- Paddle swing has no cooldown/animation, just contact-based hits.
