---
name: Tre Giorni
description: A 3-day Italy planner set as a night-navy departure board that only schedules what is open and says what it isn't sure about.
colors:
  night: "#0d1b2a"
  night-2: "#112236"
  night-3: "#16283b"
  night-4: "#1f3650"
  rule: "rgb(242 242 236 / 0.14)"
  paper: "#f2f2ec"
  paper-dim: "rgb(242 242 236 / 0.72)"
  paper-faint: "rgb(242 242 236 / 0.5)"
  signal: "#f4c430"
  signal-hover: "#ffd451"
  signal-press: "#e0b21f"
  signal-soft: "rgb(244 196 48 / 0.14)"
  go: "#2e7d5b"
  stop: "#c8102e"
  stop-soft: "rgb(200 16 46 / 0.18)"
  stop-text: "#ff8a9a"
typography:
  display:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "clamp(3rem, 6vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.02em"
  time:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "\"tnum\" 1"
  title:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1"
  meta:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.12em"
  lamp:
    fontFamily: "Barlow Condensed, Barlow, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  base: "4px"
  pill: "9999px"
spacing:
  hair: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  section: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.night}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.signal-hover}"
  button-primary-active:
    backgroundColor: "{colors.signal-press}"
  button-secondary:
    backgroundColor: "{colors.night-3}"
    textColor: "{colors.paper}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.night-4}"
  button-ghost:
    textColor: "{colors.paper-dim}"
    rounded: "{rounded.base}"
    padding: "0 12px"
    height: "32px"
  button-ghost-hover:
    backgroundColor: "{colors.night-3}"
    textColor: "{colors.paper}"
  button-danger-hover:
    backgroundColor: "{colors.stop-soft}"
    textColor: "{colors.paper}"
  icon-button:
    textColor: "{colors.paper-dim}"
    rounded: "{rounded.base}"
    size: "32px"
  icon-button-active:
    backgroundColor: "{colors.signal-soft}"
    textColor: "{colors.signal}"
  chip:
    textColor: "{colors.paper-dim}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "36px"
  chip-on:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.night}"
  segmented-option-on:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.night}"
    rounded: "{rounded.base}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.night-2}"
    textColor: "{colors.paper}"
    rounded: "{rounded.base}"
    padding: "0 12px"
    height: "48px"
  day-tab:
    backgroundColor: "{colors.night-3}"
    textColor: "{colors.paper-dim}"
    padding: "8px 16px 12px"
  day-tab-active:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.night}"
  lamp-open:
    backgroundColor: "{colors.go}"
    textColor: "{colors.paper}"
    typography: "{typography.lamp}"
    rounded: "{rounded.base}"
    height: "24px"
    padding: "0 8px"
  lamp-book:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.night}"
    typography: "{typography.lamp}"
    rounded: "{rounded.base}"
    height: "24px"
    padding: "0 8px"
  lamp-train:
    backgroundColor: "{colors.stop}"
    textColor: "{colors.paper}"
    typography: "{typography.lamp}"
    rounded: "{rounded.base}"
    height: "24px"
    padding: "0 8px"
  lamp-unsure:
    textColor: "{colors.paper-dim}"
    typography: "{typography.lamp}"
    rounded: "{rounded.base}"
    height: "24px"
    padding: "0 8px"
  board-row:
    textColor: "{colors.paper}"
    padding: "14px 16px"
  board-row-shaded:
    backgroundColor: "{colors.night-2}"
  board-row-changed:
    backgroundColor: "{colors.signal-soft}"
  board-row-train:
    backgroundColor: "{colors.stop-soft}"
---

# Design System: Tre Giorni

## Overview

**Creative North Star: "The Partenze Board"**

The interface is an Italian station departure board at night. The schedule is the hero: every stop is set in the board's column rhythm (Time, Stop, Duration, Price, Status), with large condensed tabular times in signal yellow on a night-navy ground and rows that alternate by one navy step. It deliberately refuses the category default of white cards beside a map with a blue accent.

The system is dense, flat and operational. Depth comes from four navy steps and hairline rules, not shadows. Colour carries meaning, never decoration: yellow is the board's announcing voice, green and red are status lamps, and the outline of a lamp (solid or dashed) says whether the fact is verified. Type is a single family in two widths: Barlow Condensed, uppercase and tracked, for everything the board announces; Barlow for everything a person reads.

Motion is minimal and functional: colour transitions of about 150ms, and one signature behaviour where a changed row holds a yellow tint until the user has looked at it.

**Key Characteristics:**
- Night-navy ground with four tonal steps; warm off-white type at three opacities.
- Signal yellow is the board's voice; it never decorates.
- Solid lamp = verified fact to act on; dashed lamp = the data doesn't confirm it.
- Condensed, uppercase, tracked labels; tabular numerals everywhere.
- 4px corners, hairline rules, flat rows.

## Colors

A night palette with one hot accent and two railway status colours, all used as signals rather than ornament.

### Primary
- **Signal Yellow** (signal): the board's announcing voice. Departure times, column heads and their 2px underline, the active day tab, the primary action, the active route line and numbered markers on the map, form field labels and section headings, rank numerals, selected chips and segments, the focus ring, text caret and selection. Its hover (signal-hover) and press (signal-press) steps exist only for the primary button.
- **Signal Wash** (signal-soft): yellow at 14% for state, not emphasis: a changed board row, an active icon toggle (lock, swap).

### Secondary
- **Railway Green** (go): solid "Open" lamp only. A verified, nothing-to-do fact.
- **Railway Red** (stop): solid train lamp, conflict lamp, the Trains marker in Before-you-go, the confirm ring on "Discard plan".
- **Red Wash** (stop-soft): train departure rows, conflict alert panels, danger-button hover.
- **Signal Pink** (stop-text): the legible form of red on navy. The dashed "Time est." train lamp outline and inline closure warnings in the must-see picker. Full-strength red fails as text and thin outlines on night, so this step carries it.

### Neutral
- **Night** (night): page ground, sticky header and footer bars (at 95% with blur), map marker fill.
- **Night Step 2** (night-2): shaded board rows, panels, inputs, the segmented track, Leaflet ground.
- **Night Step 3** (night-3): inactive day tabs, secondary buttons, the swap panel, hover on rows and ghost buttons.
- **Night Step 4** (night-4): hover on secondary and icon buttons, the drag overlay, scrollbar thumb.
- **Hairline** (rule): every border and row divider.
- **Paper** (paper): primary text. **Paper Dim** (paper-dim): secondary lines, inactive controls. **Paper Faint** (paper-faint): metadata, walking legs, free time, hints.

### Named Rules
**The Lamp Rule.** A solid lamp is a verified fact you must act on (Open in green, Book ahead in yellow, Train in red). A dashed outline means the data doesn't confirm it (hours, visit length, booking, season, location, train time). Colour is never the only signal: every lamp carries a text label.

**The Signal Voice Rule.** Yellow means "the board is telling you this": a time, a heading, a selection, the one primary action, the active route. If an element is not announcing, selected, or the primary action, it is not yellow.

**The Night Steps Rule.** Elevation and grouping use the four navy steps (night to night-4) and hairlines. No new greys, no tinted cards.

## Typography

**Display Font:** Barlow Condensed (with Barlow, system-ui)
**Body Font:** Barlow (with system-ui)

**Character:** One family in two widths. The condensed cut, uppercase and tracked, is the departure-board voice; regular Barlow is the explanation beneath it. Both are self-hosted via next/font. Tabular numerals are on globally so times and prices align in columns.

### Hierarchy
- **Display** (700, 3rem to 3.75rem, 0.95): landing headline only, uppercase.
- **Headline** (700, 2.25rem to 3rem, uppercase, 0.02em): page titles in the flow ("Choose a route"). Day-tab city names use the same voice at 1.125rem to 1.25rem.
- **Time** (700, 24px to 28px, 1, tabular): departure times in board rows; 18px in the swap list.
- **Title** (600, 1.125rem): stop names in board rows; route names at 1.25rem.
- **Body** (400, 15px, tabular): controls, list entries, durations and prices. Lead paragraphs step up to 1.125rem in paper-dim, held to about 36rem.
- **Meta** (400, 0.875rem): reasons, type and neighbourhood, place descriptions, hints, in paper-dim or paper-faint.
- **Label** (600, 13px to 15px, 0.12em, uppercase condensed): column heads, field labels, section headings, progress steps, weekday stamps.

### Named Rules
**The Two Widths Rule.** Condensed uppercase is for what the board announces (times, column heads, labels, city names, the wordmark); regular Barlow is for what a person reads. Never set a sentence in the condensed caps.

**The Tabular Rule.** Every number sits on tabular figures. Times, durations, prices and ratings must align down a column.

## Layout

The board is a six-column grid on medium screens and up (time 6.5rem, stop flexible, duration 5.5rem, price · rating 8rem, status 9.5rem, actions 6.75rem) with 16px gutters and 14px vertical row padding. Below 768px the row collapses to a two-column grid (4.5rem time, then content) and the duration, price, lamps and actions wrap under the stop name. Walking legs and free time are quiet sub-rows indented to the stop column (8.5rem).

From 1024px the board page splits into the board (flexible) and a 24rem right rail with the day map (320px tall) above Before-you-go. Below 1024px the map is behind a "Show map" toggle and Before-you-go becomes a panel under the board. Only one map instance mounts at a time.

Flow pages (setup, routes) sit in a 64rem column with 20px to 32px side padding and 40px between sections; the landing uses a 72rem two-column split. Setup keeps its primary action in a fixed bottom bar. The sticky board header is a single row: wordmark, trip summary, "Other routes", the primary Regenerate button, and "Start over" set apart by an extra 32px.

## Elevation & Depth

Flat by default. Rows, panels, tabs and cards carry no shadow; depth is the navy step plus a hairline. Sticky bars use night at 95% with a small backdrop blur. Shadows exist only on things that float over other content.

### Shadow Vocabulary
- **Drag lift** (`box-shadow: 0 12px 32px rgb(0 0 0 / 0.5)`): the item being dragged in the must-see picker.
- **Marker lift** (`box-shadow: 0 2px 6px rgb(0 0 0 / 0.5)`): numbered stop markers over the map.

### Named Rules
**The Flat Board Rule.** Board rows, tabs and panels never take a shadow. Only an object physically floating above the page (a dragged item, a map marker) may.

## Shapes

Square-ish 4px corners on everything rectangular: buttons, inputs, panels, route cards, lamps, the segmented track and its options; day tabs round only their top corners. Two deliberate exceptions: interest and city chips are full pills, and map markers are 28px circles with a 2px yellow ring (dashed when the location is approximate, matching the Lamp Rule). Borders are 1px hairlines; the board's column-head underline is the one 2px rule, in yellow. Dashed borders are reserved for uncertainty and for disabled-for-now regions.

## Components

### Buttons
Compact and decisive; colour shifts on hover, nothing moves.
- **Shape:** 4px corners; heights 32px (sm), 40px (md), 48px (lg); 600 weight.
- **Primary:** signal yellow with night text. One per view: Regenerate on the board, "Show route options" in setup.
- **Secondary:** night-3 with a hairline; hover steps to night-4 and a stronger line.
- **Ghost:** paper-dim text, night-3 on hover. Navigation actions ("Other routes", "Change preferences").
- **Danger:** looks like ghost at rest; hover is the red wash. Used only for "Start over", which is isolated in the header and asks twice: it swaps to "Discard plan" with a red ring plus a "Keep plan" close button.
- **Disabled:** 40% opacity, not-allowed cursor.
- **Focus:** global 2px signal outline, 2px offset.

### Icon Buttons
32px square, 4px corners, paper-dim icons at 16px (Lucide SVG). Hover is night-4; a toggled state (locked, swap open) is signal wash with a yellow icon. Remove hovers to red wash. Every icon button carries an aria-label and title.

### Chips
- **Style:** 36px pill, hairline border, paper-dim text, 15px medium.
- **State:** selected fills solid yellow with night text; city chips prefix their travel-order number.

### Segmented Control
A night-2 track with a hairline and 4px padding; options are label plus hint. The selected option fills yellow with night text and a 75% night hint. Radio-group semantics.

### Inputs / Fields
- **Style:** night-2 fill, hairline border, 4px corners, 48px tall, 17px tabular text.
- **Label:** condensed uppercase yellow label at 15px with a paper-faint hint right-aligned.
- **Focus:** the global yellow outline; caret is yellow.
- **Disabled:** not-allowed cursor inside a dashed hairline region.

### Navigation
- **Wordmark:** "TRE GIORNI" in condensed 700 caps at 1.5rem, 0.06em tracking, "Giorni" in yellow.
- **Progress:** three condensed uppercase steps at 13px; current step yellow, others paper-faint.
- **Day tabs:** three equal tabs, top corners rounded. Inactive night-3 with paper-dim text; active solid yellow with night text. Each shows a condensed date label, the city in condensed caps, an optional day-trip line, and a 4px fullness bar along the bottom (yellow on inactive tabs, night at 60% on the active one).

### Status Lamp (signature)
A 24px condensed uppercase tag at 13px, 0.08em tracking, 4px corners. Kinds: open (solid green), book ahead (solid yellow, night text), train (solid red), unsure (dashed paper-dim outline), train estimate (dashed signal-pink outline). A visit shows at most two lamps, ordered by importance; a visit with no flags shows "Open". Before-you-go repeats the grammar with a 10px square swatch (solid or dashed) beside each group heading. Its heading is followed by a plain sentence ("14 things to check across 11 stops. A stop can appear in more than one list."); each group heading carries its count as words in faint Barlow ("· 5 places"), and each entry starts with its planned day and date ("FRI 10"). In board rows the price cell shows the € level, then the rating with a small filled yellow star (Lucide `Star`, labelled "Rated 4.7 out of 5"), under the column head "Price · Rating". It opens with the trip cost profile: a count of planned stops per price level ("7 × €  7 × €€  1 × €€€"), counts as yellow condensed figures, with a faint note that the data has levels, not exact prices.

### Board Row (signature)
Shaded rows alternate night and night-2 with a hairline between. The time is the yellow condensed figure with a faint "to hh:mm" beneath; the stop number is a faint label matching the map marker. Under the stop name sit the reasons line (paper-dim) and the place's own description from the dataset, in Meta paper-faint, clamped to two lines at a 68ch measure (one truncated line in the swap list and the must-see search). Lunch and dinner slots carry a small yellow label. Row actions (swap, lock, remove) sit right-aligned. The train leg is a red-wash departure row with a paper-coloured time and the dashed "Time est." lamp. Opening Swap tints the row night-3 and expands an alternatives panel below it.

**The Noticed Rule.** A row the planner changed holds the signal wash until the pointer leaves it or focus moves out, entering with a 900ms settle from a stronger yellow on the expo ease-out. With reduced motion, the tint stays but the settle animation is dropped.

### Day Map
Leaflet with standard OpenStreetMap tiles darkened by a CSS filter (invert, hue-rotate 180deg, brightness 0.82, contrast 0.92, saturate 0.35) so they sit in the night palette; Leaflet chrome is re-themed to night-3 and hairlines. The route is a 3px yellow polyline joining numbered markers in visiting order.

## Do's and Don'ts

### Do:
- **Do** set every schedule in the board's columns (Time, Stop, Duration, Price, Status) with times as yellow condensed tabular figures.
- **Do** mark every uncertainty with a dashed lamp or dashed swatch, and every verified must-act fact with a solid one, always with a text label.
- **Do** build depth from night, night-2, night-3, night-4 and the 14% hairline.
- **Do** keep one yellow primary action per view, and keep destructive actions isolated with a two-step confirm.
- **Do** use Signal Pink (stop-text), not full red, whenever red must read as text or a thin outline on navy.
- **Do** honour reduced motion: drop the settle animation, keep the state.

### Don't:
- **Don't** fall back to white cards beside a map with a blue accent.
- **Don't** put shadows on board rows, tabs or panels.
- **Don't** use yellow for decoration, illustration or emphasis that isn't a time, heading, selection, the primary action or the route.
- **Don't** reuse a lamp colour for a meaning outside the Lamp Rule; a solid yellow lamp always means "book ahead".
- **Don't** set sentences in condensed caps, or numbers in proportional figures.
- **Don't** use corners beyond 4px except for chips (pill) and map markers (circle).
