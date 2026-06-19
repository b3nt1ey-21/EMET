# Prometheus Exotics — Lead-Gen Landing Page 🏎️

A fast, mobile-first landing page to drive **exotic car rental bookings** in Orange County —
built for a referral partner earning **10% per booking**. Every quote request is stamped with
**your referral code** and routed to the company by text, WhatsApp, or email, so you get credited.

No backend, no build step, no monthly cost. Host it free.

---

## 📁 What's here

| File | What it is |
|---|---|
| `index.html` | The landing page (hero, fleet, how-it-works, occasions, booking form, FAQ). |
| `style.css` | Luxury dark + gold styling. Fully responsive. |
| `script.js` | Fleet data, the quote form, and **lead routing with your referral code**. |
| `SALES_PLAYBOOK.md` | Your daily playbook: who to target, DM scripts, a 2-week content calendar. |
| `assets/` | Drop your car photos here. |

---

## 🚀 Quick start (3 steps)

### 1. Make it yours
Open **`script.js`** and edit the `CONFIG` block at the top:

```js
const CONFIG = {
  referralCode: "PROM-YOURCODE",   // ← your unique code (how you get paid)
  agentName:    "your name",
  companyPhone: "19495550123",     // ← company booking line, intl format (1 + 10 digits)
  companyEmail: "bookings@prometheusexotics.com",
  currency:     "$",
};
```

Then edit the `FLEET` array below it — real cars, specs, and **daily rates**.

### 2. Add photos (optional but recommended)
Put images in `assets/` (e.g. `assets/huracan.jpg`) and set the `img` field for that car:

```js
{ id: "huracan", name: "Lamborghini Huracán EVO", ..., img: "assets/huracan.jpg" },
```

Leave `img: ""` to use the built-in gradient placeholder. Use wide photos (~1200×800).

### 3. Preview it
Just open `index.html` in your browser. Or run a local server:

```bash
cd prometheus-exotics
python3 -m http.server 8000
# visit http://localhost:8000
```

---

## 🌐 Put it live (free)

Any of these work — pick one:

- **GitHub Pages:** push this repo → Settings → Pages → deploy from branch. Your URL becomes
  `https://<you>.github.io/<repo>/prometheus-exotics/`.
- **Netlify / Vercel:** drag-and-drop the `prometheus-exotics` folder. Instant URL + custom domain.
- **Cloudflare Pages:** connect the repo, set the folder, done.

Put that URL in your **Instagram/TikTok bio** and in every DM. That's your storefront.

---

## 💸 How you get paid

1. A renter fills out the quote form.
2. The page builds a message that starts with `Referral: PROM-YOURCODE (your name)`.
3. They tap **Text / WhatsApp / Email** — it opens pre-filled, addressed to the company.
4. The company sees your code on the lead → you earn your 10%.

> ⚠️ Lock in the tracking agreement with the owner **before** you start sending leads.
> See step 0 of `SALES_PLAYBOOK.md`. A copy of every lead is also saved in the browser's
> local storage (`pe_leads`) as your own backup record.

---

## 🛠️ Customizing

- **Add/remove cars:** edit the `FLEET` array in `script.js`. The grid *and* the booking
  dropdown both build from it automatically.
- **Change colors:** edit the CSS variables at the top of `style.css` (`--gold`, `--bg`, etc.).
- **Edit copy:** all text lives in `index.html`.

---

## ✅ Notes

- All placeholder cars/rates are realistic OC market examples — **swap in the real fleet & prices**.
- The page works offline and on any device; nothing is sent anywhere until the lead chooses a channel.
- This is a referral/marketing tool — confirm pricing, insurance, and age policy with the owner
  before publishing.

Now read `SALES_PLAYBOOK.md` and go book some cars. 🔑
