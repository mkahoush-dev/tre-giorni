# Tre Giorni: 3 days in Italy

An interactive 3-day trip planner built on the provided `italy.json` (103 places). It only schedules what the data says is open, explains every stop, and is upfront about what it isn't sure of.

- **Three entry modes:** Surprise me · I have ideas (drag in must-sees) · I know my route
- **Deterministic planner:** user-ordered priorities → route options → a feasible 3-day board, each stop showing why it was picked and the place's own description. Swap, lock, remove, regenerate.
- **Honest about uncertainty:** solid status = verified fact; dashed = the data doesn't confirm it. A "Before you go" list collects everything to check, starting with a trip cost profile (stops per € level; the data has no exact prices).
- **Optional AI:** describe the trip in your own words. Your own Anthropic, OpenAI or Gemini key, sent from your browser straight to the provider, fills in the form. The output is validated against the dataset.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 321 tests (Vitest)
npm run normalize    # rebuild data/places.json + data/normalization-report.md from data/raw/italy.json
npm run build        # static production build
```

## Docs

- [docs/walkthrough.mp4](docs/walkthrough.mp4): 2:21 captioned video walkthrough (the app, then the backend)
- [docs/WRITEUP.md](docs/WRITEUP.md): the 1–2 page submission note
- [docs/DATA-CLEANING.md](docs/DATA-CLEANING.md): every problem found in the data and what was done about it
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how it works, with diagrams and file pointers
- [data/normalization-report.md](data/normalization-report.md): every data fix and assumption
- [DESIGN.md](DESIGN.md) / [PRODUCT.md](PRODUCT.md): design system and product context

## Stack

Next.js 16 (App Router, static) · React 19 · TypeScript · Tailwind 4 · Vitest · dnd-kit · Leaflet + OpenStreetMap · Zod · official Anthropic / OpenAI / Google GenAI SDKs (browser mode, lazy-loaded).
