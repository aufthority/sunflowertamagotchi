# 🌻 Bloom v2 — Tamagotchi Habit Garden

> Grow your habits like a tamagotchi sunflower. Show up every day — water it, feed it, talk to it. Watch it bloom or wilt based on how consistent you are.

## What's new in v2

- 🧬 **Mood system** — flowers express 5 emotional states: Seed, Happy 😊, Okay 🙂, Sad 😔, Wilting 😢
- 😢 **Wilting animation** — drooping stem + tears when you've been absent
- 😊 **Happy face** — curved smile + blush + glow when you check in
- 🌿 **Fertilise action** — 4th care action (water, sun, talk, fertilise)
- ⚡ **Energy + Mood vitals** — 3 separate health bars
- 🏆 **Milestone system** — 8 unlockable milestones with badges (1, 3, 7, 14, 21, 30, 60, 100 days)
- 💬 **Speech bubbles** — flower says context-aware things based on mood
- 📊 **Richer journal** — grouped by date with growth context
- 🔔 **Notification permission flow** — in-app prompt + settings toggle
- ⚙️ **Settings tab** — identity display, notification toggle, data reset

## Sunflower growth stages

| Streak | Stage | Petals |
|--------|-------|--------|
| 0 days | 🌱 Seed | — |
| 1–2 days | Sprouting | 4 petals |
| 3–6 days | Budding | 8 petals |
| 7–13 days | Growing | 12 petals |
| 14–20 days | Blooming | 16 petals |
| 21+ days | 🌻✨ Thriving | 16 petals + full centre |

## Flower moods

| Mood | Trigger | Face |
|------|---------|------|
| 😊 Happy | Checked in today | Smile + blush |
| 🙂 Okay | Active streak, not yet checked in | Neutral |
| 😔 Sad | Missed yesterday | Frown |
| 😢 Wilting | Missed 3+ days | Drooping + tear |
| 🌱 Seed | Brand new habit | Simple eyes |

## Project structure

```
bloom-v2/
├── index.html          — PWA shell
├── style.css           — Styles (warm botanical + tamagotchi)
├── app.js              — All logic: state, SVG engine, care mechanics
├── sw.js               — Service worker (offline)
├── manifest.json       — PWA config
├── vercel.json         — Vercel routing
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── .github/workflows/deploy.yml
└── README.md
```

## Run locally

No build step. Pure HTML/CSS/JS.

```bash
# Python (built-in)
python3 -m http.server 3000

# Or Node
npx serve .
```

Open `http://localhost:3000`.

> Service workers and install prompts need HTTPS. Use a real deployment for full PWA features.

## Deploy to Vercel (recommended)

**Option A — CLI:**
```bash
npm i -g vercel
vercel
```

**Option B — GitHub import:**
1. Push to GitHub
2. [vercel.com](https://vercel.com) → New Project → Import repo
3. Framework: **Other** (static)
4. Deploy

Once live on HTTPS, the install prompt appears automatically on Android.

## iOS install

1. Open in Safari
2. Tap **Share** → **Add to Home Screen**
3. Tap **Add**

## Roadmap (next steps)

- [ ] Push notifications via a small backend (Cloudflare Worker)
- [ ] Animated rain / wilting in the garden scene
- [ ] Multiple gardens / habit groups
- [ ] Supabase sync for cross-device persistence
- [ ] Friends — share your garden
- [ ] Seasonal themes (winter, spring, autumn)
- [ ] Export streak data as CSV

---

Made with 🌱 and stubbornness.
