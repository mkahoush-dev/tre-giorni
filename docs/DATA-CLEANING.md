# Data cleaning: what was wrong with `italy.json` and what I did about it

The brief warned that the data is "realistic, not clean". This document lists every problem found, how it was detected, the decision taken, and why. The cleaning runs once, ahead of time (`npm run normalize` → `scripts/normalize.ts`). It never edits the original file (`data/raw/italy.json`), and it writes a machine-generated audit log of every change to [`data/normalization-report.md`](../data/normalization-report.md).

**Guiding rule:** *fix what is clearly wrong, interpret what is vague, assume only when there's no information, and record which of these happened for every fact*, so the app can show the user what it's sure of and what it isn't.

---

## At a glance

| # | Problem | Places affected | What was done | Confidence recorded |
|---|---|---|---|---|
| 1 | Opening hours in 57 different free-text formats | 65 (of 70 with hours) | Parsed into a weekly schedule by a tested parser | `listed` |
| 2 | Vague hours ("Evenings", "Morning only") | 5 | Interpreted as a time window | `inferred` |
| 3 | A schedule hidden in a seasonal note | 1 | Extracted (Mon–Fri 08:00–13:00) | `inferred` |
| 4 | No opening hours at all | 32 | Default by place type | `assumed` |
| 5 | Missing visit duration | 9 | Median duration for that place type | `assumed` |
| 6 | Seasonal rules written as prose | 16 | Turned into hard closures, soft preferences, booking months, a monthly rule; note always kept | rule + note |
| 7 | A wrong coordinate (156 km off) | 1 | Moved to a place in the same neighbourhood | `locationApproximate` |
| 8 | Duplicate / same-spot entries | 2 pairs | Kept both; at most one per trip | `siteGroup` |
| 9 | A tourist trap rated 2.1 | 1 | Kept, but never picked automatically | `excludedReason` |
| 10 | Missing booking flag | 1 | Marked unknown | `booking: "unknown"` |
| 11 | Time of day only in the place's name | 5 | Turned into a start-time window | `startWindow` |
| 12 | Inconsistent tag spelling | 1 | Normalised | — |
| 13 | Visit longer than the opening hours | 1 | Left as is; planner treats restaurant hours as seating times | reported |
| 14 | Price as € symbols | 103 | Converted to a number 1–4 | — |

Result: **103 places in, 103 out** (nothing deleted; 1 excluded from automatic planning). Hours confidence: **65 listed · 6 inferred · 32 assumed.** 75 logged entries in the report.

---

## 1. Opening hours: 57 different formats

**Found:** 70 places have an `hours` string, written 57 different ways:

```
9:00-19:00                          Tues-Sun 8:15-18:50
Mon-Sat 12:30-14:30, 19:30-22:30    Mon-Fri 7:00-14:00, Sat 7:00-17:00
Tues, Thurs-Sun 10:00-18:00         Wed-Mon 10:00-19:00
8am-7pm      9am-12:30pm            8:00-01:00      Daily 10:00-24:00
```

**Done:** `parseHours()` (`src/lib/parse-hours.ts:77`) converts each one into a weekly schedule (`mon … sun → [{open, close}]`, in minutes). One rule covers every format: *days collect until a time range appears; the range applies to those days (or to every day if none were named); a day named after a range starts a new group.* It also handles split shifts, day ranges that wrap past Sunday (`Wed-Mon`), am/pm, and closing after midnight (`8:00-01:00` becomes a close time of 25:00).

**Why it matters:** "Is it open at 14:00 on Friday?" becomes a lookup instead of a guess. A test loads the real file and checks that **all 57 strings parse**. Text the parser doesn't understand returns `null`, so it can never guess silently.

---

## 2–4. Vague, hidden and missing hours

| Case | Places | Decision | Why |
|---|---|---|---|
| `"Evenings"` | Aperitivo at Rasputin, Cicchetti Bar Crawl, Cremeria Mascareta, Aperitivo Culture Walk | 18:00–23:00 daily, **inferred** | Matches what the places are (aperitivo, bar crawls) |
| `"Morning only"` | Campo de' Fiori Market | 07:00–13:00 daily, **inferred** | Typical Roman market hours |
| Hours `null`, but the note says *"Tours run weekday mornings only"* | Cheese & Prosciutto Tour, Parma | Mon–Fri 08:00–13:00, **inferred** | The schedule was in the wrong field |
| Hours `null`: squares, viewpoints, neighbourhoods, bridges (e.g. Piazza Navona, Trevi Fountain, Ponte Vecchio) | 20 | Always accessible, **assumed** | Public spaces have no opening hours |
| Hours `null`: park (Villa Borghese) | 1 | 07:00–21:00, **assumed** | A sensible park default |
| Hours `null`: experiences and day trips (e.g. Siena Day Trip, Gondola, Burano) | 11 | 09:00–18:00, **assumed** | Daytime default |

**How the app uses the confidence:** inferred and assumed hours show as **dashed** "Hours approx." / "Hours ?" labels, are listed under "Hours not confirmed" in *Before you go*, and score ×0.9, so a verified place wins a close call.

---

## 5. Missing visit duration (9 places)

**Found:** `duration_minutes: null` for 8 viewpoints (Aventine Keyhole, Piazzale Michelangelo, Trevi Fountain by Night…) and the Rialto Bridge.

**Done:** filled with the **median duration of that place type** in the data (viewpoint 45 min, historic site 60 min) and marked `assumed`. The UI shows a dashed "Time est." label.

**Why median:** it comes from the data itself, and one unusually long visit can't skew it.

---

## 6. Seasonal rules hidden in prose (16 notes)

`parseSeasonal()` (`src/lib/parse-seasonal.ts:30`) uses narrow, explicit patterns. **The original note is always kept and shown**, so nothing is lost even when no rule is extracted.

| Note says | Rule | Effect in the planner | Places |
|---|---|---|---|
| "Open April–October only" | `openMonths` (hard) | Not scheduled out of season; a must-see becomes an *out-of-season* conflict | Chianti by Bike, Bellagio, Villa del Balbianello, Como Lakefront |
| "October only" | `openMonths: [10]` (hard) | Same | Isola della Scala Risotto Festival |
| "Best April–October" / "Best May–September" | `bestMonths` (soft) | Still schedulable; "Off-season" label | Appian Way, Navigli, Orto Botanico |
| "**Rooftop** open May–September only" | `bestMonths` (soft) | The venue stays open; only the rooftop closes | Ceresio 7 |
| "Booking essential April–October" | `bookingMonths` | "Book ahead" only in those months | Uffizi |
| "Third weekend of each month only" | `thirdWeekendOnly` | Scheduled only on the 3rd Sat/Sun of the month | Brera Antique Market |
| "Summer queues can be brutal", "Tickets sell out 2 months ahead", … | (note only) | Shown in *Before you go* | Colosseum, Last Supper, Vatican, Boboli |

**The judgement call:** "Rooftop open … only" looks like a closure but isn't. Treating it as one would hide a venue that's open.

---

## 7. A wrong coordinate (Brera Antique Market)

**Found:** coordinates `(45.4724, 11.191)`. The longitude should be about **9.19**: a one-digit typo that puts the market 156 km east of Milan.

**How it was found:** this point is still *inside Italy*, so a simple "is it in Italy?" check passes it. It showed up because **every** Milan place looked ~10 km from the city centre: one outlier had dragged the *average*. Two fixes followed:
1. The city centre is now the **median** of its places (one bad point can't move it).
2. Any place more than 50 km from its city is flagged.

**Done:** moved to the coordinates of another place in the **same neighbourhood** (Pinacoteca di Brera; the description says the market fills "the streets around the Pinacoteca di Brera") and marked `locationApproximate` (dashed map marker, "Location approx." label).

---

## 8. Duplicates and same-spot entries (2 pairs)

**Found:** two pairs with identical coordinates:
- **Trevi Fountain** and **Trevi Fountain by Night**
- **Mercato Centrale Firenze** (market, Mon–Sat mornings) and **Mercato Centrale** (food hall, daily 10:00–24:00), really the two floors of one building, with different hours

**Done:** **both entries kept** (they describe genuinely different experiences and hours), grouped by a `siteGroup`. The planner schedules **at most one per trip**, and Swap won't offer the twin as an "alternative".

**Why not delete one:** the dataset is the source of truth, and each entry carries different, valid information.

**Edge case found while building:** after Brera was moved onto the Pinacoteca's coordinates, it was wrongly grouped as a duplicate. Places with corrected locations are now excluded from the same-spot check.

---

## 9. A tourist trap (Hard Rock Cafe Rome, rated 2.1)

**Found:** every other place is rated 3.8–5.0, and this one is 2.1 with only a `tourist-heavy` tag.

**Done:** kept in the data with `excludedReason: "Rated 2.1, below the 3 floor"`. It's **never picked automatically**, and it isn't shown to the AI. A user can still choose it on purpose as a must-see.

---

## 10. Missing booking flag (Il Sorpasso)

**Found:** `booking_required: null`.

**Done:** `booking: "unknown"`, shown as a dashed "Booking ?" label and listed under "Check if booking is needed". Assuming "no" could cost someone a table; assuming "yes" would be invented.

---

## 11. Time of day only in the name (5 places)

**Found:** *Piazza del Popolo **at Dawn***, *Early Morning in Cannaregio*, *Piazza Maggiore **at Night***, *Trevi Fountain **by Night***, *Navigli Canals at **Aperitivo Hour***. Their hours are null ("always accessible"), so without a rule the planner put Piazza del Popolo *at Dawn* at 14:36.

**Done:** names are turned into start windows (dawn 06:00–10:00, night 20:00–23:00, aperitivo 18:00–20:00), and the planner moves the start into the window.

---

## 12–14. Smaller fixes

- **Tag spelling:** `local_favorite` (Aperitivo Culture Walk) → `local-favorite`. All tags lowercased and deduplicated.
- **Visit longer than opening hours:** Osteria Francescana lists a 240-minute visit but its longest service is 120 minutes. **Left as is** (it's a tasting menu). The planner treats restaurant hours as *seating* times (arrive at least 45 min before closing) instead of requiring the whole meal to fit.
- **Price:** `€`…`€€€€` → `1`…`4`, so budgets compare numerically. The data has **no exact prices** (only three euro amounts appear inside descriptions), so the app never shows invented euro figures. The board shows each stop's level and a trip cost profile (stops per level) instead.

---

## Checked and found clean

Not everything was broken. These checks passed, which is also useful to know:

- No duplicate ids or names (103 unique).
- Every place has a rating (2.1–5.0), a price, a type, and a description.
- All coordinates are inside Italy (the Brera error is only visible relative to its own city).
- Every non-null duration is plausible (15–480 min).
- No tag contradicts the hours (e.g. an "evening" place that closes by 18:00). The script checks this automatically.

## Deliberately not changed

- **Descriptions are shown verbatim.** They aren't rewritten or summarised, and they aren't sent to the LLM (its catalog is id, name, city, type and tags only).
- **`neighborhood` is null for 19 places.** It's only used for display and the coordinate fix, so nothing was invented.
- **The Vatican's "last Sunday of the month" free opening** isn't modelled. Mon–Sat hours are used, and the note is shown.
- **Boboli's "summer hours extend to 19:30"** isn't modelled. The listed 16:30 close is used, which is the safe choice.
- **Day-trip towns** (Siena, Modena, Lake Como…) stay as their own cities. The planner maps them to a base city (Siena → Florence) instead of rewriting the data.

---

## How it's verified

- `src/lib/parse-hours.test.ts`: every hours format, including all 57 real strings.
- `src/lib/parse-seasonal.test.ts`: hard vs soft rules, booking months, third weekend.
- `src/lib/planner/plan.test.ts`: across 270 generated plans, no place is ever scheduled when its (parsed) hours or season say closed. Hard Rock is never auto-picked, and same-spot twins never both appear.
- Reproduce: `npm run normalize` regenerates `data/places.json` and the report from the untouched raw file.
