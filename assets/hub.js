/* EMET Arcade — game registry + homepage rendering.
 *
 * TO ADD A GAME: copy one block below, change the fields, and create a folder
 * games/<id>/index.html. That's it — the card shows up automatically.
 *
 *   id     folder name under games/  (also the link target)
 *   title  shown on the card
 *   emoji  the card "art"
 *   tag    little category chip (Arcade, Puzzle, Classic, ...)
 *   desc   one-line description
 *   accent hex color used for the card's glow/thumbnail
 */
const GAMES = [
  {
    id: "reel-frenzy",
    title: "Reel Frenzy",
    emoji: "🎣",
    tag: "Arcade",
    desc: "Dodge fish on the dive, hook them on the way up. Chase the high score.",
    accent: "#2b8fd6",
  },
  {
    id: "snake",
    title: "Snake",
    emoji: "🐍",
    tag: "Classic",
    desc: "Eat, grow, and don't bite your own tail. Speeds up as you go.",
    accent: "#3ddc7e",
  },
  // More games go here — see the note above. (Snake's folder is a good template.)
];

function cardHTML(g) {
  return `
    <a class="card" href="games/${g.id}/index.html" style="--accent:${g.accent}"
       data-name="${(g.title + " " + g.tag + " " + g.desc).toLowerCase()}">
      <div class="thumb">
        <span aria-hidden="true">${g.emoji}</span>
        <div class="play"><span>▶ Play</span></div>
      </div>
      <div class="meta">
        <div class="title"><span>${g.title}</span><span class="tag">${g.tag}</span></div>
        <p class="desc">${g.desc}</p>
      </div>
    </a>`;
}

const grid = document.getElementById("grid");
grid.innerHTML = GAMES.map(cardHTML).join("");

// Live search filter
const search = document.getElementById("search");
search.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  for (const card of grid.querySelectorAll(".card")) {
    const match = !q || card.dataset.name.includes(q);
    card.style.display = match ? "" : "none";
    if (match) shown++;
  }
  let empty = grid.querySelector(".empty");
  if (!shown) {
    if (!empty) {
      empty = document.createElement("p");
      empty.className = "empty";
      grid.appendChild(empty);
    }
    empty.textContent = `No games match “${search.value}”.`;
  } else if (empty) {
    empty.remove();
  }
});
