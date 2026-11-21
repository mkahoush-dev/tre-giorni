"""Generate the architecture SVGs for docs/diagrams. Shared helpers keep every diagram in one visual language."""
import html, sys, os

OUT = sys.argv[1]
NAVY, INK, MUTED, RULE = "#0d1b2a", "#1d2b3a", "#5b6878", "#c9d1da"
SIGNAL, SIGNAL_SOFT = "#f4c430", "#fff6d6"
GO, GO_SOFT = "#2e7d5b", "#e3f2ea"
STOP, STOP_SOFT = "#c8102e", "#fde7ea"
BLUE_SOFT = "#eaf1f8"
FONT = "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif"
MONO = "'JetBrains Mono', 'SF Mono', Menlo, monospace"
warnings = []

def esc(s): return html.escape(s, quote=True)

class D:
    def __init__(self, w, h, title, subtitle=""):
        self.w, self.h, self.parts = w, h, []
        self.name = title
        self.parts.append(f'<rect width="{w}" height="{h}" fill="#ffffff"/>')
        self.text(32, 44, title, 22, NAVY, 700)
        if subtitle: self.text(32, 68, subtitle, 13.5, MUTED)

    def text(self, x, y, s, size=13, color=INK, weight=400, anchor="start", mono=False, italic=False):
        fam = MONO if mono else FONT
        st = ' font-style="italic"' if italic else ""
        self.parts.append(f'<text x="{x}" y="{y}" font-family="{esc(fam)}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}"{st}>{esc(s)}</text>')

    def fit(self, s, size, w, mono=False):
        est = len(s) * size * (0.61 if mono else 0.54)
        if est > w: warnings.append(f"{self.name}: '{s[:40]}' ~{est:.0f}px > {w}px")

    def box(self, x, y, w, h, title, lines=(), fill="#ffffff", stroke=RULE, tcolor=NAVY, code=None, sw=1.5, dash=False):
        d = ' stroke-dasharray="6 4"' if dash else ""
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>')
        cy = y + 24
        self.fit(title, 14, w - 24); self.text(x + 12, cy, title, 14, tcolor, 700)
        if code:
            cy += 18; self.fit(code, 11.5, w - 24, True); self.text(x + 12, cy, code, 11.5, MUTED, 400, mono=True)
        for ln in lines:
            cy += 18; self.fit(ln, 12.5, w - 24); self.text(x + 12, cy, ln, 12.5, INK)
        return (x, y, w, h)

    def group(self, x, y, w, h, label, color=MUTED, fill="none"):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{color}" stroke-width="1.2" stroke-dasharray="5 5"/>')
        self.text(x + 14, y + 22, label.upper(), 11.5, color, 700)

    def pill(self, x, y, s, fill=SIGNAL, color=NAVY, size=11.5):
        w = len(s) * size * 0.6 + 16
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w:.0f}" height="20" rx="10" fill="{fill}"/>')
        self.text(x + w / 2, y + 14, s, size, color, 700, "middle")
        return w

    def arrow(self, pts, label=None, color=NAVY, dash=False, lx=None, ly=None, lcolor=None, width=1.6, anchor="middle"):
        mid = {"#0d1b2a": "a-navy", GO: "a-go", STOP: "a-stop", MUTED: "a-muted", "#b8860b": "a-gold"}[color]
        d = ' stroke-dasharray="6 5"' if dash else ""
        path = "M " + " L ".join(f"{px} {py}" for px, py in pts)
        self.parts.append(f'<path d="{path}" fill="none" stroke="{color}" stroke-width="{width}"{d} marker-end="url(#{mid})"/>')
        if label:
            if lx is None:
                (x1, y1), (x2, y2) = pts[len(pts) // 2 - 1], pts[len(pts) // 2]
                lx, ly = (x1 + x2) / 2, (y1 + y2) / 2 - 7
            w = len(label) * 11.5 * 0.56 + 10
            bx = lx - w / 2 if anchor == "middle" else lx - 5
            self.parts.append(f'<rect x="{bx:.0f}" y="{ly - 13:.0f}" width="{w:.0f}" height="18" rx="4" fill="#ffffff" opacity="0.92"/>')
            self.text(lx, ly, label, 11.5, lcolor or color, 600, anchor)

    def save(self, fname, alt):
        defs = "<defs>" + "".join(
            f'<marker id="{i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="{c}"/></marker>'
            for i, c in [("a-navy", NAVY), ("a-go", GO), ("a-stop", STOP), ("a-muted", MUTED), ("a-gold", "#b8860b")]) + "</defs>"
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}" role="img" aria-labelledby="t d">'
               f'<title id="t">{esc(self.name)}</title><desc id="d">{esc(alt)}</desc>{defs}' + "".join(self.parts) + "</svg>\n")
        with open(os.path.join(OUT, fname), "w") as f: f.write(svg)

# =====================================================================================
# 1. System overview
d = D(1280, 820, "1 · System overview", "There is no application server: the 'backend' is TypeScript that runs at build time (data cleaning) and in the browser (planner + AI).")
d.group(24, 92, 300, 560, "Build time · your machine / CI")
d.box(44, 128, 260, 74, "italy.json (raw)", ["103 places, messy hours, nulls"], code="data/raw/italy.json")
d.box(44, 242, 260, 110, "Normalize script", ["parse hours & seasons", "fix coords, fill durations", "same-site groups, rating floor"], fill=BLUE_SOFT, code="scripts/normalize.ts")
d.box(44, 392, 260, 74, "Cleaned data", ["103 places + confidence flags"], code="data/places.json")
d.box(44, 486, 260, 74, "Audit report", ["every fix and assumption"], code="data/normalization-report.md")
d.box(44, 580, 260, 56, "next build", [], code="npm run build → static pages", fill="#f6f7f9")
d.arrow([(174, 202), (174, 242)], "npm run normalize", lx=174, ly=227)
d.arrow([(174, 352), (174, 392)])
d.arrow([(304, 300), (316, 300), (316, 523), (304, 523)], color=MUTED)

d.group(352, 92, 250, 560, "Hosting · static files")
d.box(372, 128, 210, 128, "Static site", ["/  landing (prerendered)", "/plan  app shell", "JS bundle includes", "places.json"], code="Vercel / any CDN")
d.box(372, 290, 210, 128, "Security headers", ["Content-Security-Policy", "connect-src: self +", "3 LLM APIs only", "img-src: self + OSM"], fill=GO_SOFT, stroke=GO, tcolor=GO, code="next.config.ts")
d.box(372, 452, 210, 92, "No server code", ["no API routes", "no database", "no secrets stored"], fill=SIGNAL_SOFT, stroke="#b8860b", tcolor="#8a6400")
d.arrow([(304, 608), (338, 608), (338, 192), (372, 192)], "deploy", lx=338, ly=400)

d.group(630, 92, 626, 560, "User's browser · all logic runs here")
d.box(650, 128, 280, 92, "Landing page", ["3 entry modes", "real sample plan (computed at build)"], code="src/app/page.tsx")
d.box(650, 244, 280, 120, "Trip app (UI)", ["Setup → Routes → Board", "one useReducer holds trip state", "saved to sessionStorage (tab only)"], code="src/components/trip/TripApp.tsx")
d.box(650, 388, 280, 96, "Reducer", ["actions call planner functions →", "no planning logic in the UI"], code="src/components/trip/state.ts")
d.box(964, 128, 272, 174, "Planner (deterministic)", ["routeOptions → plan → buildDay", "rules: hours, seasons, budget", "score: user-ordered priorities", "edit: swap / remove / lock /", "regenerate"], fill=BLUE_SOFT, code="src/lib/planner/*")
d.box(964, 326, 272, 146, "AI layer (optional)", ["free text → preferences (AiBox)", "3 provider adapters (SDKs)", "validateWishes = trust boundary", "key only in memory / tab"], fill="#f3eefc", stroke="#7b5ea7", tcolor="#5a3d8a", code="src/lib/ai/*")
d.box(650, 508, 280, 120, "Map", ["Leaflet, one instance", "tiles darkened via CSS"], code="src/components/trip/DayMap.tsx")
d.box(964, 496, 272, 132, "Catalog", ["PLACES, PLACE_BY_ID", "imported from places.json", "(bundled at build)"], code="src/lib/catalog.ts")
d.arrow([(790, 220), (790, 244)])
d.arrow([(790, 364), (790, 388)])
d.arrow([(930, 430), (948, 430), (948, 215), (964, 215)])
d.arrow([(930, 340), (956, 340), (956, 420), (964, 420)])
d.arrow([(1100, 302), (1100, 326)], color=MUTED)
d.arrow([(1100, 496), (1100, 472)], color=MUTED)
d.arrow([(582, 192), (650, 174)], "HTML/JS", lx=616, ly=176)

d.group(630, 676, 626, 120, "External services · called directly by the browser")
d.box(650, 706, 190, 74, "Anthropic API", ["api.anthropic.com"], fill="#f3eefc", stroke="#7b5ea7", tcolor="#5a3d8a")
d.box(856, 706, 190, 74, "OpenAI API", ["api.openai.com"], fill="#f3eefc", stroke="#7b5ea7", tcolor="#5a3d8a")
d.box(1062, 706, 174, 74, "Gemini API", ["generativelanguage…"], fill="#f3eefc", stroke="#7b5ea7", tcolor="#5a3d8a")
d.arrow([(1180, 472), (1180, 690), (1150, 706)], "key + text (HTTPS)", color=GO, lx=1180, ly=600)
d.box(352, 706, 250, 74, "OpenStreetMap tiles", ["tile.openstreetmap.org"], fill="#f6f7f9")
d.arrow([(650, 600), (480, 600), (480, 706)], "map images", color=MUTED, lx=560, ly=594)
d.save("01-system-overview.svg", "Build-time normalize script produces places.json, bundled into a static Next.js site; in the browser the trip app's reducer calls the deterministic planner and optional AI layer, which talks directly to LLM providers.")

# =====================================================================================
# 2. Data pipeline
d = D(1280, 700, "2 · Data cleaning pipeline (runs once, ahead of time)", "scripts/normalize.ts turns each RawPlace into a Place, recording every fix in data/normalization-report.md.")
d.box(32, 100, 230, 150, "RawPlace", ["hours: \"Tues, Thurs-Sun …\"", "duration_minutes: null", "booking_required: null", "seasonal_notes: free text", "tags: local_favorite"], code="data/raw/italy.json")
steps = [
    ("normalizeLocation", ":125", ["median city centre;", ">50 km → snap to same-", "neighbourhood place"]),
    ("normalizeHours", ":88", ["parseHours(raw)", "listed | inferred |", "assumed (type default)"]),
    ("parseSeasonal", "parse-seasonal.ts:30", ["openMonths (hard)", "bestMonths (soft)", "bookingMonths, 3rd wknd"]),
    ("normalizeDuration", ":118", ["null → median for", "that type, assumed"]),
    ("normalizeBooking", ":149", ["true / false /", "null → \"unknown\""]),
    ("startWindow", ":71", ["\"at Dawn\" → 06–10", "\"by Night\" → 20–23"]),
    ("normalizeTags", ":80", ["lowercase, _ → -", "dedupe"]),
]
x0, y0 = 300, 100
for i, (n, ln, lines) in enumerate(steps):
    col, row = i % 4, i // 4
    d.box(x0 + col * 236, y0 + row * 158, 220, 138, n, lines, fill=BLUE_SOFT, code=f"normalize.ts{ln}" if ln.startswith(":") else ln)
d.arrow([(262, 175), (300, 175)])
d.group(300, 420, 944, 150, "Whole-dataset passes (after every place is built)")
d.box(320, 456, 290, 98, "Same-site groups", ["places < 20 m apart share a", "siteGroup (Trevi ×2, Mercato ×2)"], code="normalize.ts:203")
d.box(626, 456, 290, 98, "Rating floor", ["rating < 3.0 → excludedReason", "(Hard Rock Cafe, 2.1)"], code="normalize.ts:159")
d.box(932, 456, 296, 98, "Contradiction checks", ["duration > longest opening", "tag \"evening\" but closes by 18:00"], code="normalize.ts:219, :231")
d.arrow([(772, 396), (772, 420)])
d.box(300, 600, 460, 76, "data/places.json", ["Place[] with confidence on every uncertain fact"], fill=GO_SOFT, stroke=GO, tcolor=GO)
d.box(784, 600, 460, 76, "data/normalization-report.md", ["63 logged fixes, grouped by category"], fill=SIGNAL_SOFT, stroke="#b8860b", tcolor="#8a6400")
d.arrow([(530, 570), (530, 600)], color=GO)
d.arrow([(1010, 570), (1010, 600)], color="#b8860b")
d.box(32, 300, 230, 250, "parseHours grammar", ["left → right tokens:", "day tokens accumulate", "a time range applies to them", "(or to every day if none)", "a day after a range starts", "a new group", "close ≤ open → +24 h", "unknown text → null"], fill="#f6f7f9", code="parse-hours.ts:77")
d.save("02-data-pipeline.svg", "Raw places pass through per-field normalizers, then whole-dataset passes, producing places.json and an audit report.")

# =====================================================================================
# 3. Planning pipeline
d = D(1280, 760, "3 · From preferences to an itinerary", "Two public calls: routeOptions(input) offers 3 city routes; plan(input, route) builds the 3 days. Same input → same output.")
d.box(32, 100, 250, 190, "TripInput", ["startDate", "interests[]", "priorities[] (ordered)", "pace, maxPrice", "mustSee[] ids", "locked[], exclude[]", "cities[] (route mode)"], code="planner/types.ts")
d.group(310, 92, 450, 300, "routeOptions()  ·  plan.ts:111")
d.box(330, 128, 200, 100, "requiredHubs", ["must-see cities", "(day trips → hub)"], code="plan.ts:15")
d.box(546, 128, 196, 100, "candidateRoutes", ["1 city ×3, or pairs", "≤150 min train;", "3 cities only if forced"], code="plan.ts:20")
d.box(330, 252, 412, 120, "scoreRoute (per candidate)", ["sum of best place scores each day, only places", "open on that date · travel day counts 60%", "− train hours × 0.3 · −100 per must-see it can't host", "→ top 3, highlights = picks not shared by all"], code="plan.ts:63")
d.arrow([(282, 178), (330, 178)])
d.arrow([(530, 178), (546, 178)])
d.arrow([(644, 228), (644, 252)])
d.box(790, 128, 210, 110, "Route ×3", ["dayCities [A, A, B]", "label, trainMinutes", "highlights"], fill=SIGNAL_SOFT, stroke="#b8860b", tcolor="#8a6400")
d.arrow([(742, 312), (770, 312), (770, 183), (790, 183)])
d.text(1020, 160, "user picks one", 12.5, MUTED, 600, italic=True)
d.arrow([(895, 238), (895, 420)], "chosen route")
d.group(310, 410, 940, 320, "plan(input, route)  ·  plan.ts:147")
d.box(330, 448, 280, 130, "tripDates", ["3 dates in UTC → weekday,", "month, day of month"], code="rules.ts:13")
d.box(330, 594, 280, 120, "PlanContext", ["used ids, usedSites,", "reserved (pinned ids),", "mustSee, locked, exclude"], code="schedule.ts")
d.box(632, 448, 290, 130, "assignMustSees", ["most constrained first:", "fewest days that can host it", "(dayCanHost: city, date,", "excursion rule) → pinnedByDay"], code="plan.ts:186")
d.box(632, 594, 290, 124, "Conflicts", ["not-in-route · out-of-season", "closed-that-day · day-overfull", "day-trip-needs-full-day", "too-many-cities (routes)"], fill=STOP_SOFT, stroke=STOP, tcolor=STOP)
d.box(944, 448, 290, 130, "buildDay × 3 (in order)", ["greedy slot fill, shared", "'used' sets so nothing", "repeats across days", "→ see diagram 4"], fill=BLUE_SOFT, code="schedule.ts:77")
d.box(944, 594, 290, 120, "Itinerary", ["route, days[ DayPlan ],", "conflicts[]", "DayPlan.items: Visit | Travel"], fill=GO_SOFT, stroke=GO, tcolor=GO)
d.arrow([(282, 250), (300, 250), (300, 513), (330, 513)])
d.arrow([(610, 513), (632, 513)])
d.arrow([(922, 513), (944, 513)])
d.arrow([(1089, 578), (1089, 594)], color=GO)
d.arrow([(777, 578), (777, 594)], "can't place / unplaced", color=STOP, lx=800, ly=590, anchor="start")
d.arrow([(944, 560), (930, 560), (930, 640), (922, 640)], color=STOP)
d.arrow([(470, 578), (470, 594)], color=MUTED)
d.save("03-planning-pipeline.svg", "routeOptions computes required hubs, candidate routes and scores; plan computes dates, assigns must-sees to days, builds each day and collects conflicts.")

# =====================================================================================
# 4. buildDay
d = D(1280, 900, "4 · buildDay: the greedy day builder", "schedule.ts:77 — walks the pace template slot by slot; each slot takes a pinned place if one fits, else the best-scoring feasible place.")
d.box(32, 100, 300, 150, "Start of day", ["cursor = 09:00, position = city centre", "arriving by train? add train row,", "cursor += train + 15 min", "pinned day-trip town? add train", "out, switch context to the town"], code="schedule.ts:77-108")
d.box(32, 280, 300, 150, "Pace template", ["relaxed: act, lunch, act, act, dinner", "balanced: act, act, lunch, act,", "act, dinner", "packed: + one more act, + evening"], code="constants.ts DAY_TEMPLATE")
d.box(390, 100, 330, 110, "For each slot", ["skip lunch if already done/too late", "deadline = next meal earliest + 30", "(or 22:30 if no meal left)"], fill=SIGNAL_SOFT, stroke="#b8860b", tcolor="#8a6400")
d.arrow([(332, 175), (390, 155)])
d.arrow([(332, 355), (360, 355), (360, 180), (390, 180)], color=MUTED)
d.group(380, 240, 860, 420, "bestCandidate(slot, deadline)  ·  schedule.ts:194")
d.box(400, 278, 250, 120, "1 · Pinned first", ["must-sees / locked for this", "day in the current city:", "if any fits → take it, else →"], fill=BLUE_SOFT)
d.box(670, 278, 270, 120, "2 · Candidate pool", ["same city/town, not used,", "not reserved, site not used,", "eligible (budget, rating floor)"], fill=BLUE_SOFT)
d.box(960, 278, 260, 120, "fitsSlot", ["lunch/dinner: restaurant, or", "food café/market ≥ 45 min", "activity: anything but restaurants"], code="schedule.ts:52")
d.arrow([(650, 338), (670, 338)])
d.arrow([(940, 338), (960, 338)])
d.box(400, 420, 400, 220, "evaluate(place) → start time or reject", ["start = cursor + travel (walk / bus estimate)", "meals: ≥ 12:30 / 19:30; or restaurant's own opening", "evening-only: wait to 18:00 (≤ 60 min in activity)", "name window (\"at Dawn\"): move start into it", "end ≤ deadline (long visits ≥4 h: dinner + 30)", "fitsTime: season, 3rd weekend, open that day,", "restaurants by seating time, others whole visit"], code="schedule.ts evaluate()")
d.box(820, 420, 400, 220, "score and pick", ["scorePlace(): priorities 5..1 → 0..1", "× 0.85 per same-type stop today (variety)", "highest wins; ties broken by place id", "", "→ diagram 5 for the scoring formula"], fill="#f6f7f9", code="score.ts:56")
d.arrow([(785, 398), (785, 410), (600, 410), (600, 420)])
d.arrow([(800, 530), (820, 530)])
d.box(390, 690, 400, 170, "place(candidate)", ["push walk/bus Travel row (from previous stop)", "push Visit: start, end, slot, reasons, flags", "cursor = end · position = this place", "mark id + siteGroup used, remove from pending", "lunch done if lunch or visit ≥ 4 h"], fill=GO_SOFT, stroke=GO, tcolor=GO, code="schedule.ts place()")
d.arrow([(1020, 640), (1020, 670), (590, 670), (590, 690)], "winner", color=GO, lx=800, ly=664)
d.box(820, 690, 420, 170, "After the template", ["day-trip town done → train back to hub", "leftover pinned → one more try later in the day", "(restaurant → dinner, evening tag → evening)", "still unplaced → returned → 'day-overfull'", "conflict in plan()"], fill=STOP_SOFT, stroke=STOP, tcolor=STOP)
d.arrow([(790, 775), (820, 775)])
d.arrow([(390, 775), (360, 775), (360, 200), (390, 200)], "next slot", lx=360, ly=520)
d.save("04-build-day.svg", "Flowchart of buildDay: start of day, per-slot deadline, bestCandidate with pinned-first, candidate pool, evaluation of time feasibility, scoring, placing, and the after-template steps.")

# =====================================================================================
# 5. Scoring
d = D(1280, 640, "5 · How a place is scored", "score.ts:56 — the user's priority order becomes linear weights; every signal is scaled to 0..1 so the weights mean what they say.")
d.box(32, 100, 300, 230, "User's order (example)", ["1. Hidden gems   × 5", "2. My interests  × 4", "3. Less walking  × 3", "4. Top rated     × 2", "5. Budget        × 1", "", "weights(): n − position"], fill=SIGNAL_SOFT, stroke="#b8860b", tcolor="#8a6400", code="score.ts:51")
d.box(380, 100, 420, 330, "signals(place) → 0..1", ["interests: matched interests (max 2) / 2", "     no interests picked → 0.5", "rating:  (rating − 3.5) / 1.5, clamped", "hidden:  0.5 + 0.5 if hidden-gem / local-", "     favourite / quiet − 0.5 if tourist-heavy", "budget:  (4 − price) / 3", "walking: 1 − min(minutes, 40) / 40", "     first stop of the day → 0.5", "", "interest → tags: food = food, market ·", "history = historic, cultural · …"], fill=BLUE_SOFT, code="score.ts:38 · constants.ts INTEREST_TAGS")
d.box(850, 100, 398, 150, "Weighted average", ["total = Σ weight × signal / Σ weight", "→ always between 0 and 1"], fill="#ffffff")
d.box(850, 280, 398, 150, "Small fixed adjustments", ["+0.05 morning tag before 12:00,", "    evening tag after 18:00", "× 0.9 hours assumed (uncertain)", "× 0.3 shown last time (Regenerate)"], fill="#f6f7f9", code="constants.ts")
d.arrow([(332, 215), (380, 215)])
d.arrow([(800, 175), (850, 175)])
d.arrow([(1049, 250), (1049, 280)])
d.box(380, 470, 420, 140, "In buildDay only", ["× 0.85 per same-type stop already today", "(three markets in a row lose to a museum)"], fill="#f6f7f9", code="constants.ts VARIETY_FACTOR")
d.box(850, 470, 398, 140, "explain() → the 'why' line", ["top 2 parts with signal > 0.5:", "\"Hidden gem · 6 min from Uffizi\"", "fallback \"Rated 4.6\"; must-see/locked first"], fill=GO_SOFT, stroke=GO, tcolor=GO, code="score.ts:79")
d.arrow([(1049, 430), (1049, 470)], color=GO)
d.arrow([(590, 430), (590, 470)], color=MUTED)
d.box(32, 360, 300, 256, "Worked example", ["Aventine Keyhole, first stop,", "user picked Food + Art", "hidden 1.0 × 5 = 5.0", "interests 0 × 4 = 0 (no match)", "walking 0.5 × 3 = 1.5", "rating 0.73 × 2 = 1.47", "budget 1.0 × 1 = 1.0", "total = 8.97 / 15 = 0.60", "hours assumed × 0.9 = 0.54"], fill="#ffffff", stroke=NAVY)
d.save("05-scoring.svg", "User priority order becomes weights 5 to 1; each place's five signals scaled 0 to 1 are combined as a weighted average with small fixed adjustments; the top contributions become the explanation.")

# =====================================================================================
# 6. AI + key flow (sequence)
d = D(1280, 860, "6 · The one LLM step, and where the API key goes", "Free text → structured preferences. The key travels browser → provider only; output is untrusted until validateWishes accepts it.")
cols = [("User", 90), ("AiBox + aiKey", 300), ("interpretWishes", 520), ("Provider adapter (SDK)", 760), ("LLM provider", 1010), ("Reducer / form", 1190)]
for name, x in cols:
    d.parts.append(f'<rect x="{x - 88}" y="92" width="176" height="40" rx="8" fill="{NAVY}"/>')
    d.text(x, 117, name, 13, "#ffffff", 700, "middle")
    d.parts.append(f'<line x1="{x}" y1="132" x2="{x}" y2="830" stroke="{RULE}" stroke-width="1.5" stroke-dasharray="4 4"/>')
def msg(y, a, b, label, color=NAVY, dash=False):
    xa, xb = cols[a][1], cols[b][1]
    d.arrow([(xa, y), (xb - (8 if xb > xa else -8), y)], label, color=color, dash=dash, lx=(xa + xb) / 2, ly=y - 8)
msg(170, 0, 1, "pastes key, picks provider/model, types text")
d.box(196, 190, 208, 92, "setKey(key, remember)", ["memory only, or", "sessionStorage if", "\"Remember for this tab\""], fill=GO_SOFT, stroke=GO, tcolor=GO)
msg(310, 1, 2, "interpretWishes(provider, key, model, text)")
d.box(432, 330, 176, 70, "trim to 1500 chars", ["empty → error, no call"], fill="#f6f7f9")
msg(430, 2, 3, "callProvider(…)")
d.box(652, 450, 216, 144, "build request", ["system = rules + catalog", "(id | name | city | type |", "tags; excluded places", "left out)", "schema = WishesSchema"], fill=BLUE_SOFT, code="schema.ts:82")
msg(610, 3, 4, "HTTPS, key in auth header only", GO)
d.box(902, 630, 216, 92, "structured output", ["Anthropic: output_config", "OpenAI: text.format strict", "Gemini: response_format"], fill="#f3eefc", stroke="#7b5ea7", tcolor="#5a3d8a")
msg(745, 4, 3, "JSON (untrusted)", STOP, dash=True)
msg(775, 3, 2, "raw object · or AiError (auth / rate-limit / refused / truncated)", STOP, dash=True)
d.box(432, 790, 300, 56, "validateWishes()  ·  schema.ts:51", [], fill=GO_SOFT, stroke=GO, tcolor=GO)
d.arrow([(732, 818), (1182, 818)], "apply-wishes: fills form, adds must-sees", color=GO, lx=960, ly=810)
d.group(1060, 150, 210, 200, "CSP · next.config.ts", color=GO)
d.text(1072, 196, "connect-src allows only:", 12.5, INK)
for i, h in enumerate(["'self'", "api.anthropic.com", "api.openai.com", "generativelanguage", ".googleapis.com"]):
    d.text(1072, 218 + i * 20, h, 12, GO, 600, mono=True)
d.text(1072, 330, "fetch elsewhere → blocked", 12, STOP, 700)
d.save("06-ai-and-key-flow.svg", "Sequence diagram: user enters key and text, key stored in memory, interpretWishes calls the provider adapter, which calls the provider directly over HTTPS; the untrusted JSON is validated before the reducer applies it.")

# =====================================================================================
# 7. UI state loop
d = D(1280, 640, "7 · UI state: every action calls a pure planner function", "state.ts:94 — the reducer is the only place state changes; it delegates all planning to src/lib/planner, so the UI holds no planning logic.")
rows = [
    ("set-input", "merge form changes", "—"),
    ("find-routes", "step → routes", "routeOptions(input)"),
    ("choose-route", "step → board", "plan(input, route)"),
    ("swap", "changed = [new id]", "replaceVisit(…)  (alternatives from alternativesFor)"),
    ("remove", "", "removeVisit(…)  → relink travel rows"),
    ("toggle-lock", "", "toggleLock(…)"),
    ("regenerate", "changed = new ids", "regenerate(): locked kept, shown ×0.3"),
    ("apply-wishes", "only filled fields", "validated Wishes from the AI layer"),
    ("seen / set-day / back-to", "UI bookkeeping", "—"),
]
d.parts.append(f'<rect x="32" y="96" width="1216" height="34" rx="6" fill="{NAVY}"/>')
for x, h in [(48, "Action"), (330, "State change"), (590, "Calls")]:
    d.text(x, 118, h, 13, SIGNAL, 700)
for i, (a, s, c) in enumerate(rows):
    y = 134 + i * 40
    if i % 2 == 0: d.parts.append(f'<rect x="32" y="{y}" width="1216" height="40" fill="#f4f6f9"/>')
    d.text(48, y + 25, a, 13, NAVY, 700, mono=True)
    d.text(330, y + 25, s, 13, INK)
    d.text(590, y + 25, c, 13, INK, mono=c != "—")
d.box(32, 512, 380, 104, "Persistence", ["useEffect → saveState(state)", "sessionStorage 'tre-giorni:trip:v1'", "never contains the API key"], code="state.ts:161-190")
d.box(440, 512, 380, 104, "Client-only rendering", ["/plan loads TripApp with ssr: false", "(sessionStorage + Leaflet need window)"], code="src/app/plan/TripLoader.tsx")
d.box(848, 512, 400, 104, "Why this split matters", ["planner is pure → 321 unit tests", "UI change can't break a rule", "extend: add an action + a planner fn"], fill=GO_SOFT, stroke=GO, tcolor=GO)
d.save("07-ui-state-loop.svg", "Table of reducer actions, the state they change, and the pure planner function each one calls; plus persistence and client-only rendering notes.")

print("\n".join(warnings) if warnings else "no overflow warnings")
