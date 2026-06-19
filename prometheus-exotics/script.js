/* =========================================================
   Prometheus Exotics — landing page logic
   ---------------------------------------------------------
   👉 EDIT THE CONFIG BLOCK BELOW. That's the only part you
      need to touch to make this yours.
   ========================================================= */

const CONFIG = {
  // ---- YOUR referral identity (this is how you get paid your 10%) ----
  // Put a unique code the company recognizes as YOU. Every lead carries it.
  referralCode: "PROM-YOURCODE",
  agentName: "your name",

  // ---- Where leads should be sent (the company's booking line) ----
  // Use full intl format for WhatsApp, e.g. 19495550123 (US = 1 + 10 digits)
  companyPhone: "19495550123",
  companyEmail: "bookings@prometheusexotics.com",

  // ---- Currency symbol for rates ----
  currency: "$",
};

/* ---------------------------------------------------------
   FLEET — edit cars, specs, and daily rates here.
   `img` can be a photo URL (e.g. "assets/huracan.jpg"). If left
   empty, a styled gradient placeholder is used automatically.
   --------------------------------------------------------- */
const FLEET = [
  { id: "huracan",  name: "Lamborghini Huracán EVO", badge: "Supercar",  hp: "631 hp", seats: "2 seats", rate: 1295, img: "", g: ["#1c1f3b", "#0a0a0b"] },
  { id: "f488",     name: "Ferrari 488 Spider",      badge: "Convertible",hp: "661 hp", seats: "2 seats", rate: 1450, img: "", g: ["#3a0d12", "#0a0a0b"] },
  { id: "mclaren",  name: "McLaren 720S",            badge: "Supercar",  hp: "710 hp", seats: "2 seats", rate: 1550, img: "", g: ["#2a2410", "#0a0a0b"] },
  { id: "ghost",    name: "Rolls-Royce Ghost",       badge: "Luxury",    hp: "563 hp", seats: "5 seats", rate: 1495, img: "", g: ["#101826", "#0a0a0b"] },
  { id: "urus",     name: "Lamborghini Urus",        badge: "Super SUV", hp: "641 hp", seats: "5 seats", rate: 995,  img: "", g: ["#2a1208", "#0a0a0b"] },
  { id: "g63",      name: "Mercedes-AMG G63",        badge: "SUV",       hp: "577 hp", seats: "5 seats", rate: 695,  img: "", g: ["#15110a", "#0a0a0b"] },
  { id: "911",      name: "Porsche 911 Carrera S",   badge: "Sport",     hp: "443 hp", seats: "4 seats", rate: 745,  img: "", g: ["#0f1c1a", "#0a0a0b"] },
  { id: "c8",       name: "Chevrolet Corvette C8",   badge: "Sport",     hp: "495 hp", seats: "2 seats", rate: 445,  img: "", g: ["#2a0f0f", "#0a0a0b"] },
  { id: "rover",    name: "Range Rover Autobiography",badge: "Luxury SUV",hp: "523 hp", seats: "5 seats", rate: 595,  img: "", g: ["#14181c", "#0a0a0b"] },
];

/* ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const money = (n) => CONFIG.currency + n.toLocaleString("en-US");

/* ---- Render the fleet grid ---- */
function renderFleet() {
  const grid = $("#fleet-grid");
  const select = $("#car-select");
  if (!grid) return;

  grid.innerHTML = FLEET.map((c) => {
    const bg = c.img
      ? `background-image:url('${c.img}')`
      : `background-image:linear-gradient(135deg, ${c.g[0]}, ${c.g[1]})`;
    return `
      <article class="car" data-car="${c.name}">
        <div class="car__img" style="${bg}">
          <span class="car__badge">${c.badge}</span>
        </div>
        <div class="car__body">
          <h3 class="car__name">${c.name}</h3>
          <div class="car__specs"><span>⚡ ${c.hp}</span><span>👤 ${c.seats}</span></div>
          <div class="car__foot">
            <span class="car__rate">${money(c.rate)} <small>/ day</small></span>
            <button class="car__btn" type="button" data-pick="${c.name}">Reserve</button>
          </div>
        </div>
      </article>`;
  }).join("");

  // Populate the booking dropdown from the same data
  select.insertAdjacentHTML(
    "beforeend",
    FLEET.map((c) => `<option value="${c.name}">${c.name} — ${money(c.rate)}/day</option>`).join("")
  );

  // "Reserve" buttons jump to the form and preselect the car
  grid.querySelectorAll("[data-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      select.value = btn.dataset.pick;
      $("#book").scrollIntoView({ behavior: "smooth" });
      select.classList.add("flash");
      setTimeout(() => select.classList.remove("flash"), 600);
    });
  });
}

/* ---- Build the message that gets sent to the booking team ---- */
function buildMessage(data) {
  const lines = [
    `NEW BOOKING REQUEST — Prometheus Exotics`,
    `Referral: ${CONFIG.referralCode} (${CONFIG.agentName})`,
    ``,
    `Name:   ${data.name}`,
    `Phone:  ${data.phone}`,
    data.email ? `Email:  ${data.email}` : null,
    `Car:    ${data.car}`,
    `Dates:  ${data.start} → ${data.end}`,
    data.message ? `Notes:  ${data.message}` : null,
    ``,
    `Sent from the Prometheus Exotics quote page.`,
  ].filter(Boolean);
  return lines.join("\n");
}

/* ---- Store a local copy so the agent has a record of every lead ---- */
function saveLead(data) {
  try {
    const leads = JSON.parse(localStorage.getItem("pe_leads") || "[]");
    leads.push({ ...data, ts: new Date().toISOString(), ref: CONFIG.referralCode });
    localStorage.setItem("pe_leads", JSON.stringify(leads));
  } catch (_) { /* storage may be unavailable; not critical */ }
}

/* ---- Wire up the quote form ---- */
function initForm() {
  const form = $("#quote-form");
  if (!form) return;
  const sent = $("#quote-sent");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const msg = buildMessage(data);
    const encoded = encodeURIComponent(msg);

    saveLead(data);

    // Pre-fill each channel with the full lead + referral code
    $("#send-sms").href  = `sms:${CONFIG.companyPhone}?&body=${encoded}`;
    $("#send-wa").href   = `https://wa.me/${CONFIG.companyPhone}?text=${encoded}`;
    $("#send-email").href =
      `mailto:${CONFIG.companyEmail}?subject=${encodeURIComponent("Booking request via " + CONFIG.referralCode)}&body=${encoded}`;

    // Swap form fields for the "choose a channel" panel
    [...form.elements].forEach((el) => { if (el.type !== "button") el.style.display = "none"; });
    form.querySelector(".quote__fineprint").style.display = "none";
    sent.hidden = false;
    sent.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $("#quote-reset").addEventListener("click", () => {
    [...form.elements].forEach((el) => { el.style.display = ""; });
    form.querySelector(".quote__fineprint").style.display = "";
    sent.hidden = true;
  });
}

/* ---- Click-to-call / text links in nav, body, footer ---- */
function initContactLinks() {
  const tel = `tel:+${CONFIG.companyPhone}`;
  ["#call-link", "#footer-call"].forEach((sel) => {
    const el = $(sel);
    if (el) el.href = tel;
  });
}

/* ---- Misc ---- */
function initMisc() {
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  renderFleet();
  initForm();
  initContactLinks();
  initMisc();
});
