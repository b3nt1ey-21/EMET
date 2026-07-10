/* Life Ledger — main.js
 * Boots the app: character creator, the real-time game loop (mapping wall-clock
 * time to in-game hours at the chosen speed), save/load to localStorage,
 * keyboard shortcuts, event modals and the game-over screen. Ties the headless
 * engine to the DOM UI.
 */
(function (G) {
  'use strict';
  const LL = G.LL;
  const { U, DATA: D, State: St, Engine: E, UI } = LL;

  const SAVE_KEY = 'lifeledger.save.v1';
  const THEME_KEY = 'lifeledger.theme';

  let state = null;
  let rafId = null;
  let lastTs = 0;
  let hourAccumulator = 0;

  // --------------------------------------------------------------- theme ---
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.dataset.theme = saved;
    else document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  function toggleTheme() {
    const cur = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = cur;
    localStorage.setItem(THEME_KEY, cur);
    if (state) UI.refresh();
  }

  // ----------------------------------------------------------- game loop ---
  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    if (!state || state.gameOver || state.pendingEvent) { lastTs = ts; return; }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.25, (ts - lastTs) / 1000); // seconds, clamp tab-switches
    lastTs = ts;
    if (state.speed <= 0) return;

    hourAccumulator += dt * state.speed; // speed = in-game hours per real second
    let guard = 0;
    while (hourAccumulator >= 1 && guard < 2000) {
      hourAccumulator -= 1;
      guard++;
      if (!E.advanceHour(state)) { hourAccumulator = 0; break; }
    }
    UI.renderTop();
    UI.renderStats();
    // Cheap partial refresh: only redraw the whole panel a few times a second.
    const now = performance.now();
    if (now - (loop._lastPanel || 0) > 400) { loop._lastPanel = now; UI.renderPanel(); }
  }

  function setSpeed(s) {
    if (!state) return;
    state.speed = s;
    lastTs = 0;
    UI.renderTop();
  }

  // -------------------------------------------------------------- events ---
  function showChoice(pe) {
    state.speed = 0;
    UI.renderTop();
    const ov = document.getElementById('overlay');
    const card = document.getElementById('overlay-card');
    card.innerHTML = `<h2>A decision to make</h2><p style="color:var(--ink2);margin:8px 0 4px">${U.esc(pe.text)}</p><div class="choices"></div>`;
    const box = card.querySelector('.choices');
    pe.labels.forEach((label, i) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => {
        E.resolveChoice(state, i);
        ov.hidden = true;
        UI.refresh();
      };
      box.appendChild(b);
    });
    ov.hidden = false;
  }

  function showGameOver() {
    const go = state.gameOver;
    const y = state.you;
    const ov = document.getElementById('overlay');
    const card = document.getElementById('overlay-card');
    card.innerHTML = `
      <h2>⚰️ A Life Lived</h2>
      <p style="color:var(--ink2)">${U.esc(go.cause)}</p>
      <div class="big" style="margin:14px 0 2px">Legacy Score: ${go.legacy.toLocaleString()}</div>
      <div class="grid" style="margin-top:14px">
        <div class="card">${statRows([
          ['Final age', go.age],
          ['Last role', go.career],
          ['Net worth', U.money(go.netWorth)],
          ['Peak net worth', U.money(go.peak)],
          ['Achievements', go.achievements + '/' + LL.ACHIEVEMENTS.length],
          ['Married', go.married ? 'yes' : 'no'],
          ['Children', go.children],
        ])}</div>
      </div>
      <div class="btnrow" style="margin-top:16px">
        <button class="btn primary" id="go-new">Start a New Life</button>
      </div>`;
    card.querySelector('#go-new').onclick = () => { ov.hidden = true; openCreator(); };
    ov.hidden = false;
  }
  function statRows(pairs) {
    return pairs.map(([n, v]) => `<div class="row"><span class="n">${n}</span><span class="v">${v}</span></div>`).join('');
  }

  // --------------------------------------------------------------- saves ---
  function save() {
    if (!state) return;
    try { localStorage.setItem(SAVE_KEY, St.serialize(state)); } catch (e) { /* quota */ }
  }
  function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
  function load() {
    const json = localStorage.getItem(SAVE_KEY);
    if (!json) return false;
    try {
      state = St.deserialize(json);
      startGame(state, false);
      return true;
    } catch (e) { console.error('load failed', e); return false; }
  }

  function showSaveMenu() {
    const ov = document.getElementById('overlay');
    const card = document.getElementById('overlay-card');
    card.innerHTML = `<h2>💾 Saves</h2>
      <div class="btnrow" style="margin-top:12px">
        <button class="btn primary" id="sv-save">Save now</button>
        <button class="btn" id="sv-load" ${hasSave() ? '' : 'disabled'}>Load last save</button>
        <button class="btn danger" id="sv-new">New game</button>
        <button class="btn" id="sv-close">Close</button>
      </div>
      <div class="sub" style="margin-top:10px">The game autosaves every in-game week. Progress lives in this browser.</div>`;
    card.querySelector('#sv-save').onclick = () => { save(); UI.flash('Game saved.', 'good'); ov.hidden = true; };
    card.querySelector('#sv-load').onclick = () => { ov.hidden = true; load(); };
    card.querySelector('#sv-new').onclick = () => { ov.hidden = true; openCreator(); };
    card.querySelector('#sv-close').onclick = () => { ov.hidden = true; };
    ov.hidden = false;
  }

  // ---------------------------------------------------- character creator ---
  const creatorPick = { cityId: 'harborton', difficulty: 'normal', gender: 'other', traits: [] };
  function openCreator() {
    if (rafId) cancelAnimationFrame(rafId), (rafId = null);
    state = null;
    document.getElementById('app').hidden = true;
    const ov = document.getElementById('overlay');
    const card = document.getElementById('overlay-card');
    creatorPick.traits = [];

    const render = () => {
      card.innerHTML = `
        <h2>📒 Life Ledger</h2>
        <p class="sub">You're 18. The rest is up to you. Build a career, a portfolio, a family — one decision at a time.</p>

        <div style="margin-top:14px"><label class="sub">Name</label><br>
          <input type="text" id="cc-name" value="${U.esc(randomName())}" maxlength="28"></div>

        <div style="margin-top:12px"><div class="sub">Starting city <span class="hint" id="cc-city-hint"></span></div><div class="pickgrid" id="cc-city"></div></div>
        <div><div class="sub">Difficulty <span class="hint" id="cc-diff-hint"></span></div><div class="pickgrid" id="cc-diff"></div></div>
        <div><div class="sub">Personality — pick up to 3 <span class="hint" id="cc-trait-count">0/3</span></div><div class="pickgrid" id="cc-traits"></div></div>

        <div class="btnrow" style="margin-top:8px">
          <button class="btn primary" id="cc-start">Begin Life →</button>
          ${hasSave() ? '<button class="btn" id="cc-continue">Continue last save</button>' : ''}
        </div>`;

      fillPicks('cc-city', D.CITIES, 'cityId', (v) => `${v.desc}`, false, 'cc-city-hint', (v) => `col ${v.col}× · rent ${v.rent}× · pay ${v.salary}×`);
      fillPicks('cc-diff', D.DIFFICULTIES, 'difficulty', (v) => v.desc, false, 'cc-diff-hint', (v) => `start ${U.money(v.startCash)}`);
      fillTraits();

      card.querySelector('#cc-start').onclick = () => {
        const name = card.querySelector('#cc-name').value.trim() || randomName();
        const cfg = {
          name, gender: creatorPick.gender, cityId: creatorPick.cityId,
          difficulty: creatorPick.difficulty, traits: creatorPick.traits.slice(),
        };
        state = St.attachRng(St.newGame(cfg));
        E.log(state, `🌅 A new life begins in ${state.city.name}. You're 18 with ${U.money(state.you.fin.checking)} to your name.`, 'good');
        ov.hidden = true;
        startGame(state, true);
      };
      const cont = card.querySelector('#cc-continue');
      if (cont) cont.onclick = () => { ov.hidden = true; load(); };
    };

    function fillPicks(containerId, dict, key, descFn, multi, hintId, metaFn) {
      const cont = card.querySelector('#' + containerId);
      cont.innerHTML = '';
      for (const id of Object.keys(dict)) {
        const v = dict[id];
        const p = document.createElement('div');
        p.className = 'pick' + (creatorPick[key] === id ? ' on' : '');
        p.innerHTML = `<b>${U.esc(v.name)}</b><span class="sub">${U.esc(metaFn ? metaFn(v) : descFn(v))}</span>`;
        p.title = descFn(v);
        p.onclick = () => { creatorPick[key] = id; render(); };
        cont.appendChild(p);
      }
    }
    function fillTraits() {
      const cont = card.querySelector('#cc-traits');
      cont.innerHTML = '';
      for (const id of Object.keys(D.TRAITS)) {
        const t = D.TRAITS[id];
        const on = creatorPick.traits.includes(id);
        const p = document.createElement('div');
        p.className = 'pick' + (on ? ' on' : '');
        p.innerHTML = `<b>${t.icon} ${U.esc(t.name)}</b><span class="sub">${U.esc(t.desc)}</span>`;
        p.onclick = () => {
          const i = creatorPick.traits.indexOf(id);
          if (i >= 0) creatorPick.traits.splice(i, 1);
          else if (creatorPick.traits.length < 3) creatorPick.traits.push(id);
          card.querySelector('#cc-trait-count').textContent = creatorPick.traits.length + '/3';
          fillTraits();
        };
        cont.appendChild(p);
      }
      card.querySelector('#cc-trait-count').textContent = creatorPick.traits.length + '/3';
    }

    render();
    ov.hidden = false;
  }
  function randomName() {
    return U.FIRST_NAMES[Math.floor(Math.random() * U.FIRST_NAMES.length)] + ' ' +
      U.LAST_NAMES[Math.floor(Math.random() * U.LAST_NAMES.length)];
  }

  // ------------------------------------------------------------- startup ---
  function startGame(s, freshUI) {
    state = s;
    document.getElementById('app').hidden = false;

    E.onLog = (entry) => toast(entry.text, entry.type);
    E.onAchievement = (a) => toast(`🏆 ${a.name} — ${a.desc}`, 'good');
    E.onChoice = (pe) => showChoice(pe);
    E.onGameOver = () => { setSpeed(0); showGameOver(); };
    E.onAutosave = () => save();

    UI.bind(state);
    if (freshUI) UI.setActive('overview');
    else UI.renderNav();
    UI.refresh();

    lastTs = 0; hourAccumulator = 0;
    if (!rafId) rafId = requestAnimationFrame(loop);
    setSpeed(2);
  }

  // -------------------------------------------------------------- toasts ---
  const toastQueue = [];
  function toast(text, type) {
    const box = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = text;
    box.appendChild(t);
    toastQueue.push(t);
    if (toastQueue.length > 5) { const old = toastQueue.shift(); old.remove(); }
    setTimeout(() => {
      t.style.transition = 'opacity .4s'; t.style.opacity = '0';
      setTimeout(() => { t.remove(); const i = toastQueue.indexOf(t); if (i >= 0) toastQueue.splice(i, 1); }, 400);
    }, 4200);
  }

  // ------------------------------------------------------------ keyboard ---
  function onKey(e) {
    if (!state || state.gameOver) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    switch (e.key) {
      case ' ': e.preventDefault(); setSpeed(state.speed > 0 ? 0 : 2); break;
      case '1': setSpeed(2); break;
      case '2': setSpeed(8); break;
      case '3': setSpeed(32); break;
      case '4': setSpeed(128); break;
      default: {
        const tabs = ['overview', 'career', 'education', 'money', 'invest', 'assets', 'business', 'people', 'life', 'log'];
        const n = parseInt(e.key, 10);
        if (e.key === 'q') UI.setActive('overview');
      }
    }
  }

  // --------------------------------------------------------------- wire ----
  function init() {
    initTheme();
    document.getElementById('btn-theme').onclick = toggleTheme;
    document.getElementById('btn-save').onclick = showSaveMenu;
    for (const b of document.querySelectorAll('#timectl button')) {
      b.onclick = () => setSpeed(+b.dataset.speed);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', save);
    // Redraw charts on resize/orientation change.
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => state && UI.renderPanel(), 150); });

    if (!load()) openCreator();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
