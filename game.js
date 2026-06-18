/*
 * Reel Frenzy - arcade fishing game (HTML5 Canvas / vanilla JS).
 *
 * Cast your hook, DODGE fish on the way down to reach the deeper, richer
 * water, then CATCH as many as you can on the way up. Chain catches for a
 * combo multiplier and race a 90-second clock for the high score.
 *
 * No build step and no assets: the art is drawn with the Canvas 2D API and
 * the sound effects are synthesized at runtime with the Web Audio API.
 *
 * Headless smoke test (no browser needed):  node game.js --selftest 600
 */
(function () {
  "use strict";

  // ----------------------------------------------------------------------
  // Constants
  // ----------------------------------------------------------------------
  const W = 960, H = 720;
  const WATER_Y = 168;          // y of the water surface
  const SEABED_Y = H - 24;      // deepest the hook can travel
  const GAME_SECONDS = 90;

  // Hook speeds are expressed in pixels-per-frame at 60fps and scaled by a
  // per-frame `step` so motion stays framerate-independent.
  const MOVE_SPEED = 6.2, DROP_SPEED = 4.2, REEL_SPEED = 3.4;

  const HIGHSCORE_KEY = "reelFrenzyHigh";

  // Palette ([r, g, b])
  const SKY_TOP = [143, 206, 240], SKY_BOTTOM = [208, 236, 248];
  const WATER_TOP = [70, 168, 224], WATER_DEEP = [6, 20, 54];
  const SUN = [255, 241, 173], FOAM = [224, 244, 252];
  const HULL = [140, 78, 48], HULL_DARK = [104, 56, 33], DECK = [196, 142, 92];
  const ROD = [60, 44, 36], LINE = [235, 240, 245], HOOK_COLOR = [220, 226, 232];
  const WHITE = [245, 248, 250], INK = [24, 34, 52];

  // Fish species: [name, color, bodyWidth, value, baseSpeed, depthBand, weight]
  // depthBand is a [min, max] fraction of the water column (0 surface, 1 bed).
  const FISH_SPECIES = [
    ["Sardine",    [176, 196, 208], 34,   5, 2.4, [0.00, 0.45], 34],
    ["Mackerel",   [104, 160, 150], 44,  10, 2.0, [0.10, 0.55], 26],
    ["Clownfish",  [244, 142,  54], 40,  18, 1.7, [0.25, 0.70], 18],
    ["Bass",       [ 96, 124,  86], 56,  28, 1.5, [0.35, 0.80], 13],
    ["Tuna",       [ 70, 110, 156], 78,  55, 1.3, [0.55, 0.95],  7],
    ["Anglerfish", [ 58,  60,  84], 66,  95, 0.9, [0.70, 1.00],  4],
    ["Gold Koi",   [245, 200,  70], 38, 150, 2.7, [0.20, 0.95],  2],
  ];

  // ----------------------------------------------------------------------
  // Small helpers
  // ----------------------------------------------------------------------
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerpColor = (c1, c2, t) => [
    lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t),
  ];
  const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const col = (c) => (typeof c === "string" ? c : rgb(c));

  function weightedChoice(list) {
    let total = 0;
    for (const s of list) total += s[6];
    let r = Math.random() * total, up = 0;
    for (const s of list) { up += s[6]; if (r <= up) return s; }
    return list[list.length - 1];
  }

  // ----------------------------------------------------------------------
  // Procedural audio (Web Audio API). Created lazily on first user gesture so
  // it respects browser autoplay rules. Everything is guarded.
  // ----------------------------------------------------------------------
  class AudioFX {
    constructor() { this.ctx = null; this.muted = false; }

    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    }

    tone(segments, vol) {
      this.ensure();
      if (!this.ctx) return;
      const ctx = this.ctx;
      let t = ctx.currentTime;
      for (const [freq, dur] of segments) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(g); g.connect(ctx.destination);
        const attack = Math.min(0.012, dur * 0.2);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        t += dur;
      }
    }

    noise(dur, vol) {
      this.ensure();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let v = 0;
      for (let i = 0; i < n; i++) {
        v = 0.86 * v + 0.14 * (Math.random() * 2 - 1); // low-passed noise
        data[i] = v * (1 - i / n);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 1400;
      const g = ctx.createGain(); g.gain.value = vol;
      src.connect(lp); lp.connect(g); g.connect(ctx.destination);
      src.start();
    }

    play(name) {
      if (this.muted) return;
      switch (name) {
        case "cast":  this.tone([[196, 0.10], [147, 0.10]], 0.30);
                      this.noise(0.18, 0.18); break;
        case "splash": this.noise(0.18, 0.22); break;
        case "catch": this.tone([[523, 0.07], [784, 0.10]], 0.34); break;
        case "big":   this.tone([[523, 0.08], [659, 0.08], [988, 0.16]], 0.40); break;
        case "miss":  this.tone([[247, 0.10], [185, 0.14]], 0.26); break;
        case "tick":  this.tone([[1320, 0.02]], 0.10); break;
      }
    }
  }

  // ----------------------------------------------------------------------
  // Drawing routines
  // ----------------------------------------------------------------------
  function makeBackground(createCanvas) {
    const c = createCanvas(W, H);
    const g = c.getContext("2d");
    for (let y = 0; y < H; y++) {
      let color;
      if (y < WATER_Y) {
        color = lerpColor(SKY_TOP, SKY_BOTTOM, y / WATER_Y);
      } else {
        let t = (y - WATER_Y) / (H - WATER_Y);
        t = Math.pow(t, 0.85);
        color = lerpColor(WATER_TOP, WATER_DEEP, t);
      }
      g.fillStyle = rgb(color);
      g.fillRect(0, y, W, 1);
    }
    // sun + soft glow
    const glow = g.createRadialGradient(W - 120, 88, 8, W - 120, 88, 150);
    glow.addColorStop(0, "rgba(255,241,173,0.85)");
    glow.addColorStop(1, "rgba(255,241,173,0)");
    g.fillStyle = glow;
    g.fillRect(W - 300, -70, 360, 360);
    g.fillStyle = rgb(SUN);
    g.beginPath(); g.arc(W - 120, 88, 46, 0, Math.PI * 2); g.fill();
    // clouds
    for (const [cx, cy, s] of [[180, 70, 1.0], [430, 50, 0.7], [560, 96, 0.5]]) {
      g.fillStyle = "rgba(255,255,255,0.85)";
      for (const [dx, dy, rr] of [[40, 45, 34], [80, 35, 42], [125, 48, 30], [95, 55, 36]]) {
        g.beginPath(); g.arc(cx + dx * s, cy + dy * s, rr * s, 0, Math.PI * 2); g.fill();
      }
    }
    return c;
  }

  function drawFish(ctx, x, y, w, h, color, facing, wiggle) {
    const hw = w / 2, hh = h / 2;
    const dark = lerpColor(color, INK, 0.35);
    const light = lerpColor(color, WHITE, 0.30);
    const tailX = x - facing * hw;
    const flick = (wiggle - 0.5) * h * 0.7;

    // tail
    ctx.fillStyle = rgb(dark);
    ctx.beginPath();
    ctx.moveTo(tailX, y);
    ctx.lineTo(tailX - facing * h * 0.7, y - hh * 0.9 + flick);
    ctx.lineTo(tailX - facing * h * 0.7, y + hh * 0.9 + flick);
    ctx.closePath(); ctx.fill();

    // body
    ctx.fillStyle = rgb(color);
    ctx.beginPath(); ctx.ellipse(x, y, hw, hh, 0, 0, Math.PI * 2); ctx.fill();
    // top highlight
    ctx.fillStyle = rgb(light);
    ctx.beginPath();
    ctx.ellipse(x, y - hh * 0.42, hw * 0.9, Math.max(2, hh * 0.5), 0, 0, Math.PI * 2);
    ctx.fill();
    // outline
    ctx.strokeStyle = rgb(dark); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, hw, hh, 0, 0, Math.PI * 2); ctx.stroke();

    // top fin
    ctx.fillStyle = rgb(dark);
    ctx.beginPath();
    ctx.moveTo(x - facing * 2, y - hh);
    ctx.lineTo(x + facing * hw * 0.5, y - hh - h * 0.35);
    ctx.lineTo(x + facing * hw * 0.45, y - hh * 0.6);
    ctx.closePath(); ctx.fill();

    // eye
    const ex = x + facing * hw * 0.55, ey = y - h * 0.12;
    ctx.fillStyle = rgb(WHITE);
    ctx.beginPath(); ctx.arc(ex, ey, Math.max(2, h / 7), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgb(INK);
    ctx.beginPath(); ctx.arc(ex + facing, ey, Math.max(1, h / 12), 0, Math.PI * 2); ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function rodTipFor(t) {
    const bob = Math.sin(t * 1.6) * 4;
    const cx = W * 0.30;
    const deckY = WATER_Y - 6 + bob;
    return { x: cx + 150, y: deckY - 58 + bob };
  }

  function drawBoat(ctx, t) {
    const bob = Math.sin(t * 1.6) * 4;
    const cx = W * 0.30;
    const deckY = WATER_Y - 6 + bob;

    // hull
    ctx.fillStyle = rgb(HULL);
    ctx.beginPath();
    ctx.moveTo(cx - 86, deckY);
    ctx.lineTo(cx + 86, deckY);
    ctx.lineTo(cx + 60, deckY + 40);
    ctx.lineTo(cx - 60, deckY + 40);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(HULL_DARK); ctx.lineWidth = 3; ctx.stroke();

    // deck rail
    roundRect(ctx, cx - 86, deckY - 8, 172, 10, 4);
    ctx.fillStyle = rgb(DECK); ctx.fill();

    // cabin
    roundRect(ctx, cx - 40, deckY - 40, 46, 34, 4);
    ctx.fillStyle = "rgb(238,232,220)"; ctx.fill();
    ctx.strokeStyle = rgb(HULL_DARK); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgb(150,205,235)";
    ctx.fillRect(cx - 32, deckY - 33, 14, 14);
    ctx.fillRect(cx - 14, deckY - 33, 14, 14);

    // rod
    const base = { x: cx + 40, y: deckY - 6 };
    const tip = rodTipFor(t);
    ctx.strokeStyle = rgb(ROD); ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = "rgb(40,30,26)";
    ctx.beginPath(); ctx.arc(base.x, base.y, 5, 0, Math.PI * 2); ctx.fill();
  }

  function drawHook(ctx, x, y) {
    ctx.strokeStyle = rgb(HOOK_COLOR); ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x, y - 4);
    ctx.arc(x - 4, y - 4, 4, 0, Math.PI, false);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.fillStyle = rgb(HOOK_COLOR);
    ctx.beginPath(); ctx.arc(x, y - 20, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawText(ctx, str, x, y, size, color, align, baseline, shadow) {
    ctx.font = `bold ${size}px "Segoe UI", system-ui, Arial, sans-serif`;
    ctx.textAlign = align || "left";
    ctx.textBaseline = baseline || "top";
    if (shadow !== false) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillText(str, x + 2, y + 2);
    }
    ctx.fillStyle = col(color);
    ctx.fillText(str, x, y);
  }

  function gradientText(ctx, str, cx, topY, size, c1, c2) {
    ctx.font = `bold ${size}px "Segoe UI", system-ui, Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillText(str, cx + 2, topY + 3);
    const g = ctx.createLinearGradient(0, topY, 0, topY + size);
    g.addColorStop(0, rgb(c1)); g.addColorStop(1, rgb(c2));
    ctx.fillStyle = g;
    ctx.fillText(str, cx, topY);
  }

  // ----------------------------------------------------------------------
  // Entities
  // ----------------------------------------------------------------------
  class Fish {
    constructor(species, direction) {
      [this.name, this.color, this.w, this.value,
       this.baseSpeed, this.band, this.weight] = species;
      this.h = Math.round(this.w * 0.52);
      const column = SEABED_Y - WATER_Y;
      const ymin = WATER_Y + this.band[0] * column + this.h;
      const ymax = WATER_Y + this.band[1] * column;
      this.y = rand(ymin, Math.max(ymin + 1, ymax));
      this.dir = direction || (Math.random() < 0.5 ? -1 : 1);
      this.x = this.dir > 0 ? -this.w : W + this.w;
      this.speed = this.baseSpeed * rand(0.8, 1.25);
      this.phase = Math.random() * Math.PI * 2;
      this.wiggle = 0;
      this.hooked = false;
    }
    get radius() { return this.w * 0.42; }
    update(t, step) {
      this.x += this.dir * this.speed * step;
      this.y += Math.sin(t * 2 + this.phase) * 0.4 * step;
      this.wiggle = Math.sin(t * 12 + this.phase) * 0.5 + 0.5;
    }
    offscreen() { return this.x < -this.w * 2 || this.x > W + this.w * 2; }
    draw(ctx, t) {
      drawFish(ctx, this.x, this.y, this.w, this.h, this.color, this.dir, this.wiggle);
    }
  }

  class Bubble {
    constructor() { this.respawn(); }
    respawn(y) {
      this.x = rand(0, W);
      this.y = (y != null) ? y : rand(WATER_Y, SEABED_Y);
      this.r = rand(2, 6);
      this.speed = rand(0.4, 1.4);
      this.sway = Math.random() * Math.PI * 2;
    }
    update(t, step) {
      this.y -= this.speed * step;
      this.x += Math.sin(t * 2 + this.sway) * 0.4 * step;
    }
    draw(ctx) {
      const a = clamp(120 * (this.y - WATER_Y) / (SEABED_Y - WATER_Y) + 40, 30, 150) / 255;
      ctx.strokeStyle = `rgba(220,240,255,${a.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
    }
  }

  class Popup {
    constructor(x, y, text, color, size) {
      this.x = x; this.y = y; this.text = text;
      this.color = color; this.size = size; this.life = 1;
    }
    update(dt) { this.y -= 38 * dt; this.life -= dt * 0.9; }
    draw(ctx) {
      if (this.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp(this.life, 0, 1);
      drawText(ctx, this.text, this.x, this.y, this.size, this.color, "center", "top");
      ctx.restore();
    }
  }

  class Hook {
    constructor() { this.reset(W * 0.30 + 150, WATER_Y - 58); }
    reset(tx, ty) {
      this.state = "idle";        // idle | dropping | reeling
      this.tip = { x: tx, y: ty };
      this.x = tx;
      this.y = WATER_Y + 6;
      this.caught = [];
      this.maxDepth = 0;
    }
    cast(audio) {
      if (this.state === "idle") {
        this.state = "dropping";
        this.y = WATER_Y + 6;
        this.caught = [];
        audio.play("cast");
      }
    }
    startReeling(audio) {
      if (this.state === "dropping") {
        this.state = "reeling";
        audio.play("tick");
      }
    }
    update(step, left, right) {
      if (this.state === "idle") { this.x = this.tip.x; this.y = WATER_Y + 6; return; }
      if (left) this.x -= MOVE_SPEED * step;
      if (right) this.x += MOVE_SPEED * step;
      this.x = clamp(this.x, 18, W - 18);

      if (this.state === "dropping") {
        this.y += DROP_SPEED * step;
        this.maxDepth = Math.max(this.maxDepth, (this.y - WATER_Y) / (SEABED_Y - WATER_Y));
        if (this.y >= SEABED_Y) { this.y = SEABED_Y; this.state = "reeling"; }
      } else if (this.state === "reeling") {
        this.y -= REEL_SPEED * step;
        this.caught.forEach((f, i) => {
          f.x = this.x + (i + 1) * 4 * (i % 2 ? 1 : -1);
          f.y = this.y + 22 + i * 20;
        });
      }
    }
    draw(ctx, t) {
      ctx.strokeStyle = rgb(LINE); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.tip.x, this.tip.y); ctx.lineTo(this.x, this.y); ctx.stroke();
      this.caught.forEach((f) => f.draw(ctx, t));
      drawHook(ctx, this.x, this.y);
    }
  }

  // ----------------------------------------------------------------------
  // Game
  // ----------------------------------------------------------------------
  class Game {
    constructor(opts) {
      this.ctx = opts.ctx;
      this.audio = opts.audio;
      this.storage = opts.storage;
      this.createCanvas = opts.createCanvas;
      this.bg = makeBackground(this.createCanvas);
      this.fonts = { small: 22, mid: 30, big: 80 };
      this.highScore = this.loadHigh();
      this.state = "title";       // title | playing | paused | gameover
      this.t = 0;
      this.input = { left: false, right: false };
      this.reset();
    }

    loadHigh() {
      try {
        const v = this.storage.getItem(HIGHSCORE_KEY);
        return v ? (parseInt(v, 10) || 0) : 0;
      } catch (e) { return 0; }
    }
    saveHigh() {
      try { this.storage.setItem(HIGHSCORE_KEY, String(this.highScore)); } catch (e) {}
    }

    reset() {
      this.money = 0;
      this.timeLeft = GAME_SECONDS;
      this.fish = [];
      this.bubbles = Array.from({ length: 46 }, () => new Bubble());
      this.popups = [];
      this.hook = new Hook();
      this.spawnTimer = 0;
      this.comboFlash = 0;
      this.rodTip = rodTipFor(0);
      for (let i = 0; i < 10; i++) this.spawnFish();
    }

    start() { this.reset(); this.state = "playing"; }

    spawnFish() {
      if (this.fish.length > 26) return;
      this.fish.push(new Fish(weightedChoice(FISH_SPECIES)));
    }

    // ---- input ----
    cast() {
      if (this.state !== "playing") return;
      if (this.hook.state === "idle") this.hook.cast(this.audio);
      else if (this.hook.state === "dropping") this.hook.startReeling(this.audio);
    }
    pauseIfPlaying() { if (this.state === "playing") this.state = "paused"; }

    // SPACE / tap CAST: does the sensible thing for the current screen.
    primaryAction() {
      if (this.state === "title" || this.state === "gameover") this.start();
      else if (this.state === "paused") this.state = "playing";
      else if (this.state === "playing") this.cast();
    }

    onKey(k) {
      if (this.state === "title") {
        if (k === " " || k === "Enter") this.start();
      } else if (this.state === "gameover") {
        if (k === "r" || k === "R" || k === " " || k === "Enter") this.start();
      } else if (this.state === "playing") {
        if (k === " " || k === "ArrowUp") this.cast();
        else if (k === "p" || k === "P") this.state = "paused";
      } else if (this.state === "paused") {
        if (k === "p" || k === "P" || k === " ") this.state = "playing";
      }
    }

    // ---- update ----
    update(dt) {
      const step = dt * 60;
      this.t += dt;
      this.rodTip = rodTipFor(this.t);

      for (const b of this.bubbles) {
        b.update(this.t, step);
        if (b.y < WATER_Y) b.respawn(SEABED_Y);
      }
      for (const p of this.popups) p.update(dt);
      this.popups = this.popups.filter((p) => p.life > 0);
      this.comboFlash = Math.max(0, this.comboFlash - dt);

      if (this.state !== "playing") {
        for (const f of this.fish) f.update(this.t, step);
        return;
      }

      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.endGame(); return; }

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) { this.spawnTimer = rand(0.5, 1.1); this.spawnFish(); }

      for (const f of this.fish) f.update(this.t, step);
      this.fish = this.fish.filter((f) => !f.offscreen());

      this.hook.tip = this.rodTip;
      this.hook.update(step, this.input.left, this.input.right);
      this.collisions();
      if (this.hook.state === "reeling" && this.hook.y <= WATER_Y + 6) this.landCatch();
    }

    collisions() {
      const hx = this.hook.x, hy = this.hook.y;
      if (this.hook.state === "dropping") {
        // dodging phase: a touch ends the descent (fish not caught)
        for (const f of this.fish) {
          if (Math.hypot(f.x - hx, f.y - hy) < f.radius + 8) {
            this.hook.startReeling(this.audio);
            break;
          }
        }
      } else if (this.hook.state === "reeling") {
        const remaining = [];
        for (const f of this.fish) {
          if (!f.hooked && Math.hypot(f.x - hx, f.y - hy) < f.radius + 8) {
            f.hooked = true;
            this.hook.caught.push(f);
            this.audio.play("catch");
            this.popups.push(new Popup(f.x, f.y - 18, "+$" + f.value,
              [255, 244, 180], this.fonts.small));
          } else {
            remaining.push(f);
          }
        }
        this.fish = remaining;
      }
    }

    landCatch() {
      const caught = this.hook.caught;
      if (caught.length) {
        const base = caught.reduce((s, f) => s + f.value, 0);
        const n = caught.length;
        const mult = 1 + 0.25 * (n - 1);
        const total = Math.round(base * mult);
        this.money += total;
        if (n >= 2) {
          this.comboFlash = 1.2;
          this.audio.play("big");
          this.popups.push(new Popup(W * 0.30 + 150, WATER_Y - 96,
            `x${n} COMBO!  +$${total}`, [255, 214, 90], this.fonts.mid));
        } else {
          this.popups.push(new Popup(W * 0.30 + 150, WATER_Y - 80,
            `+$${total}`, [200, 255, 200], this.fonts.mid));
        }
      } else {
        this.audio.play("miss");
      }
      this.hook.reset(this.hook.tip.x, this.hook.tip.y);
    }

    endGame() {
      this.state = "gameover";
      if (this.money > this.highScore) { this.highScore = this.money; this.saveHigh(); }
    }

    // ---- rendering ----
    draw() {
      const ctx = this.ctx;
      ctx.drawImage(this.bg, 0, 0);

      // surface foam shimmer
      ctx.strokeStyle = rgb(FOAM); ctx.lineWidth = 2;
      for (let x = 0; x < W; x += 12) {
        const yy = WATER_Y + Math.sin(this.t * 2 + x * 0.05) * 2;
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 6, yy); ctx.stroke();
      }

      for (const b of this.bubbles) b.draw(ctx);
      for (const f of this.fish) f.draw(ctx, this.t);

      drawBoat(ctx, this.t);
      this.hook.tip = this.rodTip;
      if (this.hook.state === "idle") { this.hook.x = this.rodTip.x; this.hook.y = WATER_Y + 6; }
      this.hook.draw(ctx, this.t);

      for (const p of this.popups) p.draw(ctx);

      if (this.comboFlash > 0) {
        ctx.fillStyle = `rgba(255,210,90,${(0.18 * this.comboFlash).toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }

      this.drawHUD();
      if (this.state === "title") this.drawTitle();
      else if (this.state === "paused") this.overlay("PAUSED", "Press P  (or tap CAST)  to resume");
      else if (this.state === "gameover") this.drawGameOver();
    }

    drawHUD() {
      const ctx = this.ctx;
      drawText(ctx, `$${this.money}`, 20, 14, this.fonts.mid, WHITE, "left", "top");
      drawText(ctx, `Best  $${this.highScore}`, 22, 50, this.fonts.small,
        [235, 240, 245], "left", "top");
      const secs = Math.ceil(this.timeLeft);
      const tcol = this.timeLeft <= 10 ? [255, 120, 110] : WHITE;
      drawText(ctx, `${secs}s`, W - 22, 14, this.fonts.mid, tcol, "right", "top");

      if (this.state === "playing" && this.hook.state !== "idle") {
        let msg, c;
        if (this.hook.state === "dropping") {
          msg = "DIVING — dodge the fish!  (SPACE to reel)";
          c = [200, 240, 255];
        } else {
          const val = this.hook.caught.reduce((s, f) => s + f.value, 0);
          msg = `REELING — ${this.hook.caught.length} on the line  ($${val})`;
          c = [255, 232, 160];
        }
        drawText(ctx, msg, W / 2, 52, this.fonts.small, c, "center", "top");
      }
    }

    overlay(title, sub) {
      const ctx = this.ctx;
      ctx.fillStyle = "rgba(4,12,30,0.58)"; ctx.fillRect(0, 0, W, H);
      gradientText(ctx, title, W / 2, H / 2 - 70, this.fonts.big, [255, 255, 255], [150, 200, 255]);
      drawText(ctx, sub, W / 2, H / 2 + 20, this.fonts.mid, WHITE, "center", "top");
    }

    drawTitle() {
      const ctx = this.ctx;
      ctx.fillStyle = "rgba(4,12,30,0.45)"; ctx.fillRect(0, 0, W, H);
      gradientText(ctx, "REEL FRENZY", W / 2, 138, this.fonts.big, [255, 246, 200], [90, 180, 240]);
      const lines = [
        ["Dive deep dodging fish, then catch them on the way up.", false],
        ["", false],
        ["SPACE  /  tap CAST   —   cast & start reeling", false],
        ["←  →   or   A  D   —   steer the hook", false],
        ["Chain catches for a COMBO multiplier!", false],
        ["", false],
        ["Press SPACE  (or tap CAST)  to fish", true],
      ];
      let y = 322;
      for (const [ln, hi] of lines) {
        if (ln) {
          drawText(ctx, ln, W / 2, y, hi ? this.fonts.mid : this.fonts.small,
            hi ? [255, 230, 120] : WHITE, "center", "top");
        }
        y += ln ? 34 : 16;
      }
    }

    drawGameOver() {
      const ctx = this.ctx;
      ctx.fillStyle = "rgba(4,12,30,0.67)"; ctx.fillRect(0, 0, W, H);
      gradientText(ctx, "TIME!", W / 2, 168, this.fonts.big, [255, 255, 255], [150, 200, 255]);
      drawText(ctx, `$${this.money}`, W / 2, 280, this.fonts.big, [255, 224, 120], "center", "top");
      if (this.money >= this.highScore && this.money > 0) {
        drawText(ctx, "NEW BEST!", W / 2, 372, this.fonts.mid, [255, 150, 170], "center", "top");
      } else {
        drawText(ctx, `Best  $${this.highScore}`, W / 2, 378, this.fonts.small, WHITE, "center", "top");
      }
      drawText(ctx, "Press R  (or tap CAST)  to fish again", W / 2, 430,
        this.fonts.mid, WHITE, "center", "top");
    }
  }

  // ----------------------------------------------------------------------
  // Browser bootstrap
  // ----------------------------------------------------------------------
  function boot() {
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const audio = new AudioFX();
    const game = new Game({
      ctx,
      audio,
      storage: window.localStorage,
      createCanvas: (w, h) => {
        const c = document.createElement("canvas");
        c.width = w; c.height = h; return c;
      },
    });

    const STEER_KEYS = { ArrowLeft: "left", a: "left", A: "left",
                         ArrowRight: "right", d: "right", D: "right" };

    window.addEventListener("keydown", (e) => {
      audio.ensure();
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
        e.preventDefault();
      }
      const steer = STEER_KEYS[e.key];
      if (steer) game.input[steer] = true;
      game.onKey(e.key);
    });
    window.addEventListener("keyup", (e) => {
      const steer = STEER_KEYS[e.key];
      if (steer) game.input[steer] = false;
    });
    window.addEventListener("blur", () => {
      game.input.left = game.input.right = false;
      game.pauseIfPlaying();
    });

    // On-screen / pointer controls (work with both touch and mouse).
    const hold = (id, on, off) => {
      const el = document.getElementById(id);
      if (!el) return;
      const press = (e) => { e.preventDefault(); e.stopPropagation(); audio.ensure(); on(); };
      const release = (e) => { if (e) e.preventDefault(); off(); };
      el.addEventListener("pointerdown", press);
      el.addEventListener("pointerup", release);
      el.addEventListener("pointerleave", release);
      el.addEventListener("pointercancel", release);
    };
    hold("btn-left", () => (game.input.left = true), () => (game.input.left = false));
    hold("btn-right", () => (game.input.right = true), () => (game.input.right = false));
    hold("btn-cast", () => game.primaryAction(), () => {});

    // Clicking/tapping the water also acts (cast / start / restart).
    canvas.addEventListener("pointerdown", () => { audio.ensure(); game.primaryAction(); });

    let last = performance.now();
    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;     // avoid huge steps after a stall / tab switch
      game.update(dt);
      game.draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ----------------------------------------------------------------------
  // Node headless self-test (no display/audio) — mirrors the pygame version.
  // ----------------------------------------------------------------------
  function makeFakeCtx() {
    const noop = () => {};
    const grad = { addColorStop: noop };
    return {
      fillStyle: "", strokeStyle: "", lineWidth: 1, lineCap: "", lineJoin: "",
      font: "", textAlign: "", textBaseline: "", globalAlpha: 1,
      save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
      beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
      arc: noop, arcTo: noop, ellipse: noop, rect: noop,
      quadraticCurveTo: noop, bezierCurveTo: noop, setLineDash: noop,
      fill: noop, stroke: noop, fillRect: noop, strokeRect: noop, clearRect: noop, clip: noop,
      fillText: noop, strokeText: noop,
      measureText: (s) => ({ width: (s ? String(s).length : 0) * 8 }),
      createLinearGradient: () => grad, createRadialGradient: () => grad,
      drawImage: noop,
    };
  }

  function runSelfTest(n) {
    const fctx = makeFakeCtx();
    const createCanvas = (w, h) => ({ width: w, height: h, getContext: () => fctx });
    const game = new Game({
      ctx: fctx, createCanvas,
      audio: { ensure() {}, play() {} },
      storage: { getItem() { return null; }, setItem() {} },
    });

    game.state = "title"; game.draw();         // exercise title screen
    game.start();
    for (let i = 0; i < n; i++) {
      if (game.hook.state === "idle" && Math.random() < 0.05) game.primaryAction();
      if (game.hook.state === "dropping" && Math.random() < 0.02) game.primaryAction();
      game.input.left = Math.random() < 0.3;
      game.input.right = Math.random() < 0.3;
      if (i === 100) game.onKey("p");          // exercise pause screen
      if (i === 110) game.onKey("p");
      game.update(1 / 60);
      game.draw();
      if (game.state === "gameover") game.start();
    }
    console.log(`selftest OK: ran ${n} frames, money sample=${game.money}, ` +
      `fish=${game.fish.length}`);
  }

  // ----------------------------------------------------------------------
  // Dispatch: Node (export + optional CLI test) vs browser (boot on load).
  // ----------------------------------------------------------------------
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game, Fish, Hook, Bubble, Popup, AudioFX, FISH_SPECIES };
    if (typeof require !== "undefined" && require.main === module) {
      const i = process.argv.indexOf("--selftest");
      const n = i >= 0 ? (parseInt(process.argv[i + 1], 10) || 600) : 600;
      runSelfTest(n);
    }
  } else if (typeof window !== "undefined") {
    window.addEventListener("load", boot);
  }
})();
