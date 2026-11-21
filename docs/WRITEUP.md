# Tre Giorni: 3 days in Italy

**Live app:** `<LIVE_URL>` · **Code:** `<REPO_URL>` · **Run locally:** `npm install && npm run dev`

## What I built

A trip planner that turns the 103 places in `italy.json` into a personalised 3-day itinerary that **only schedules what the data says is open, explains every stop, and is upfront about what it isn't sure of.**

1. **Start from what you already know.** The landing page offers three ways in: *Surprise me* (dates and tastes only), *I have ideas* (drag in must-see places), and *I know my route* (pick your cities too). Most people arrive with a different amount of certainty, so the planner's job shifts from guessing everything to filling the gaps around your choices.
2. **Say what matters to you.** You order five priorities (my interests, top rated, hidden gems, budget, less walking). That order becomes the weights the planner uses, so two people with the same dates get noticeably different trips, and each stop can say *why* it was picked ("Hidden gem · 6 min from Uffizi").
3. **Pick a route, get a board.** The planner offers three city routes that work on your actual dates (for example "Florence 2 days → Bologna 1 day · 37 min on trains"), then builds a departure-board-style itinerary: times, walking legs, train legs, lunch and dinner at Italian hours, each place's own description, and a "Before you go" list of things to book or check.
4. **Change it without starting over.** Swap a stop (only alternatives that fit that time slot are offered), lock the ones you like, remove, or regenerate everything that isn't locked.
5. **Optionally, just describe the trip.** "We love wine and quiet places, hate crowds, must see the David." With your own Anthropic, OpenAI or Gemini key, an LLM fills in the form for you to review.

## Key decisions and why

- **The data needed real cleaning, so I did it once, ahead of time.** The data has opening hours in 57 different formats, 33 places with no hours, missing durations, seasonal rules written as prose, a coordinate typo that put a Milan market 156 km away, duplicate entries, and a 2.1-rated tourist trap. A build-time script parses, fixes or flags each one and writes an audit report. Every uncertain fact keeps its confidence (*listed / inferred / assumed*). The UI shows that as solid vs dashed labels, and uncertain places lose close calls. Details: `docs/DATA-CLEANING.md`.
- **Planning is deterministic, not AI.** Whether a place is open, how long it takes to walk, and whether lunch fits are rules problems. An LLM would be non-repeatable, slower, costlier, unable to guarantee feasibility, and hard to test. The planner scores places by your priority order, fills each day slot by slot, and never silently drops a must-see: if one can't fit, you get a specific reason ("Uffizi is closed Mondays").
- **The LLM does one job: free text → form fields.** It can only return place IDs from the dataset, and its output is validated like untrusted user input: unknown IDs are dropped and reported, and the shape is checked. You see the filled form before anything is planned.
- **Your API key never touches my server.** There is no server: the site is static and everything runs in the browser. The key goes straight from your browser to the provider and is held in memory (or for the tab only, if you choose). A Content-Security-Policy only lets the page send data to the three provider APIs, so even injected script couldn't send the key anywhere else.
- **Three days rewards focus.** Routes use one or two cities linked by a train of 2.5 hours or less. A third city appears only if your must-sees force it, and is labelled "rushed". Day trips (Siena, Lake Como) happen only when you ask for them.

Stack: Next.js + TypeScript (static), Tailwind, Vitest, dnd-kit, Leaflet. Architecture, diagrams and file pointers: `docs/ARCHITECTURE.md`.

## What I'd do with more time

- **Better plans:** the day builder is greedy (best choice per slot). A local-search pass that tries swapping stops between slots would pack days better while staying deterministic.
- **Real travel data:** live routing and real train timetables instead of distance-based estimates and a fixed train table.
- **An eval for the LLM step:** 30–50 realistic descriptions with expected fields, scored per provider and model. Today's tests cover plumbing and safety, not model quality.
- **Sharing and export:** a shareable link (cheap, because the plan rebuilds exactly from its inputs) and calendar export.
- **Product:** smarter day-trip suggestions, dragging stops between days, a weather-aware "rainy day" mode, and a keyed map-tile provider and stricter CSP before real traffic.

## How I used AI

**As a building tool.** I used Claude Code as a pair programmer, in a mode where I made the design decisions and it implemented them. I decided the product shape and architecture: the three entry modes, cleaning the data ahead of time, drag-and-drop must-sees, a deterministic planner driven by a priority order I let users set, the LLM only where language understanding is needed, bring-your-own key for any provider with the most secure key path, and deferring URL sharing. Claude proposed implementation details (scoring formula, day template, data fixes), which I reviewed. It wrote most of the code and the docs, and helped design the UI.

**How I checked its output.** I didn't take any of it on trust:
- **Tests:** 321 automated tests, including rules checked across 270 generated plans (every visit open, no overlaps, every must-see scheduled or explained). As a mutation check, removing the opening-hours rule made 273 of them fail.
- **Against the source:** I compared the cleaning report against the raw data. API calls were checked against the installed SDK types and live provider docs, which caught out-of-date model names and request formats.
- **In a real browser:** the production build, at desktop and mobile sizes, looking at the screenshots, console and network. This caught bugs unit tests didn't (a crash from a browser API change, a page stretched by hidden labels, map tiles that suddenly needed a key), and confirmed that no request to my site contains the key and that requests to other domains are blocked.
- **Independent review:** a separate reviewer checked the UI against the agreed design, and I applied its fixes.

**As a product feature.** One optional LLM call, with the user's own key, turns free text into the same preferences a person could enter by hand, validated against the dataset before use. Everything else is deterministic, so the app works fully without a key.
