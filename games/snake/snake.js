/* Snake — original implementation for EMET Arcade. No dependencies. */
(() => {
  "use strict";
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");

  const N = 20;                  // grid is N x N cells
  const CELL = canvas.width / N; // pixel size of a cell
  const BEST_KEY = "emet-snake-best";

  let snake, dir, queue, food, score, state, acc, last;
  let best = +(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = best;

  function reset() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    scoreEl.textContent = 0;
    placeFood();
    state = "ready";
    acc = 0;
    last = performance.now();
  }

  function placeFood() {
    const free = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++)
        if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    food = free.length ? free[(Math.random() * free.length) | 0] : null;
  }

  function stepMs() {
    return Math.max(70, 150 - score * 4); // speeds up as you eat
  }

  function setDir(nx, ny) {
    if (state === "ready") state = "play";
    const ref = queue.length ? queue[queue.length - 1] : dir;
    if ((nx === -ref.x && ny === -ref.y) || (nx === ref.x && ny === ref.y)) return;
    if (queue.length < 2) queue.push({ x: nx, y: ny });
  }

  function update() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N) return end("over");

    const eating = food && head.x === food.x && head.y === food.y;
    const body = eating ? snake : snake.slice(0, -1); // tail tip moves away
    if (body.some((s) => s.x === head.x && s.y === head.y)) return end("over");

    snake.unshift(head);
    if (eating) {
      score++;
      scoreEl.textContent = score;
      placeFood();
      if (!food) return end("won");
    } else {
      snake.pop();
    }
  }

  function end(how) {
    state = how;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, best);
      bestEl.textContent = best;
    }
  }

  // ---- drawing ----
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    ctx.fillStyle = "#08132e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(120,160,220,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < N; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
    }

    if (food) {
      const fx = food.x * CELL, fy = food.y * CELL;
      ctx.fillStyle = "#ff5d6c";
      rr(fx + CELL * 0.18, fy + CELL * 0.18, CELL * 0.64, CELL * 0.64, CELL * 0.22);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(fx + CELL * 0.38, fy + CELL * 0.36, CELL * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const t = i / Math.max(1, snake.length - 1); // 0 = head, 1 = tail
      ctx.fillStyle = `rgb(${40 + Math.round(t * 10)}, ${Math.round(225 - t * 120)}, ${Math.round(120 - t * 40)})`;
      rr(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 6);
    }

    if (snake.length) {
      const h = snake[0];
      const cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
      const px = -dir.y, py = dir.x; // perpendicular to heading
      ctx.fillStyle = "#04102a";
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + dir.x * CELL * 0.16 + px * sgn * CELL * 0.2,
                cy + dir.y * CELL * 0.16 + py * sgn * CELL * 0.2,
                CELL * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (state === "ready") overlay("🐍 Snake", "Press an arrow key or swipe to start");
    else if (state === "paused") overlay("Paused", "Press P to resume");
    else if (state === "over") overlay("Game Over", "Score " + score + " · Space / tap to replay");
    else if (state === "won") overlay("You win! 🏆", "You filled the board! Space / tap to replay");
  }

  function overlay(title, sub) {
    ctx.fillStyle = "rgba(4,12,30,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#eaf3ff";
    ctx.font = "bold 34px system-ui, sans-serif";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillStyle = "#bcd0ff";
    ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 24);
  }

  function loop(now) {
    const dt = now - last; last = now;
    if (state === "play") {
      acc += dt;
      const step = stepMs();
      while (acc >= step) {
        acc -= step;
        update();
        if (state !== "play") { acc = 0; break; }
      }
    } else {
      acc = 0;
    }
    draw();
    requestAnimationFrame(loop);
  }

  // ---- input ----
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "p", " ", "enter"].includes(k))
      e.preventDefault();

    if (state === "over" || state === "won") {
      if (k === " " || k === "enter") reset();
      return;
    }
    if (k === "p") { state = state === "play" ? "paused" : "play"; return; }
    if (state === "paused") return;

    if (k === "arrowup" || k === "w") setDir(0, -1);
    else if (k === "arrowdown" || k === "s") setDir(0, 1);
    else if (k === "arrowleft" || k === "a") setDir(-1, 0);
    else if (k === "arrowright" || k === "d") setDir(1, 0);
  });

  let tStart = null;
  canvas.addEventListener("touchstart", (e) => {
    tStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (!tStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStart.x, dy = t.clientY - tStart.y;
    tStart = null;
    if (state === "over" || state === "won") return reset();
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return; // a tap, not a swipe
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
  }, { passive: true });
  canvas.addEventListener("click", () => {
    if (state === "over" || state === "won") reset();
  });

  reset();
  requestAnimationFrame(loop);
})();
