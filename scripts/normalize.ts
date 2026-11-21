/**
 * One-time data cleaning: data/raw/italy.json -> data/places.json + data/normalization-report.md
 *
 * Every fix or assumption is recorded in the report so the cleaned data can be audited.
 * Run with: npm run normalize
 */
import { readFileSync, writeFileSync } from "node:fs";
import { emptyWeek, everyDay, parseHours } from "../src/lib/parse-hours";
import { parseSeasonal } from "../src/lib/parse-seasonal";
import { DAYS, type Hours, type Place, type RawPlace } from "../src/lib/types";

const RAW_PATH = "data/raw/italy.json";
const OUT_PATH = "data/places.json";
const REPORT_PATH = "data/normalization-report.md";

const MIN_RATING = 3.0;
const MAX_KM_FROM_CITY = 50;
const SAME_SITE_METERS = 20;
const DEFAULT_DURATION = 60;

// When a place has no hours at all, what do we assume?
const ALWAYS_ACCESSIBLE = new Set(["viewpoint", "neighborhood", "historic_site"]);
const DAYTIME = { open: 9 * 60, close: 18 * 60 };
const PARK_HOURS = { open: 7 * 60, close: 21 * 60 };

const raw: RawPlace[] = JSON.parse(readFileSync(RAW_PATH, "utf8"));
const report: Record<string, string[]> = {};
const log = (section: string, line: string) => (report[section] ??= []).push(line);

// ---------- helpers ----------

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Median (not mean) so one bad coordinate cannot drag the city centre.
const cityCentre = new Map<string, { lat: number; lng: number }>();
for (const city of new Set(raw.map((p) => p.city))) {
  const inCity = raw.filter((p) => p.city === city);
  cityCentre.set(city, {
    lat: median(inCity.map((p) => p.latitude)),
    lng: median(inCity.map((p) => p.longitude)),
  });
}

const durationByType = new Map<string, number>();
for (const type of new Set(raw.map((p) => p.type))) {
  const known = raw.filter((p) => p.type === type && p.duration_minutes).map((p) => p.duration_minutes!);
  durationByType.set(type, known.length ? median(known) : DEFAULT_DURATION);
}

// Names that promise a time of day. Visit start must fall inside the window.
const NAME_WINDOWS: { pattern: RegExp; window: { earliest: number; latest: number }; label: string }[] = [
  { pattern: /at dawn|early morning/i, window: { earliest: 6 * 60, latest: 10 * 60 }, label: "start 06:00-10:00" },
  { pattern: /at night|by night/i, window: { earliest: 20 * 60, latest: 23 * 60 }, label: "start 20:00-23:00" },
  { pattern: /aperitivo hour/i, window: { earliest: 18 * 60, latest: 20 * 60 }, label: "start 18:00-20:00" },
];

function startWindow(p: RawPlace) {
  const rule = NAME_WINDOWS.find((r) => r.pattern.test(p.name));
  if (!rule) return null;
  log("Time of day implied by the name", `${p.id} ${p.name} → ${rule.label}`);
  return rule.window;
}

// ---------- per-field normalizers ----------

function normalizeTags(p: RawPlace): string[] {
  const tags = p.tags.map((t) => t.trim().toLowerCase().replace(/_/g, "-"));
  p.tags.forEach((t, i) => {
    if (t !== tags[i]) log("Tag spelling unified", `${p.id} ${p.name}: "${t}" → "${tags[i]}"`);
  });
  return [...new Set(tags)];
}

function normalizeHours(p: RawPlace): Hours {
  const parsed = parseHours(p.hours);
  if (parsed) {
    if (parsed.confidence === "inferred")
      log("Hours inferred from vague text", `${p.id} ${p.name}: "${p.hours}"`);
    return { ...parsed, raw: p.hours };
  }
  if (p.hours) log("Hours could not be parsed (assumed instead)", `${p.id} ${p.name}: "${p.hours}"`);

  // A schedule hidden in the seasonal note.
  if (p.seasonal_notes?.toLowerCase().includes("weekday mornings only")) {
    const weekly = emptyWeek();
    for (const d of DAYS.slice(0, 5)) weekly[d].push({ open: 8 * 60, close: 13 * 60 });
    log("Hours inferred from vague text", `${p.id} ${p.name}: from note "${p.seasonal_notes}" → Mon-Fri 08:00-13:00`);
    return { weekly, confidence: "inferred", raw: p.hours };
  }

  let window = DAYTIME;
  let label = "09:00-18:00 daily (daytime default)";
  if (ALWAYS_ACCESSIBLE.has(p.type)) {
    window = { open: 0, close: 24 * 60 };
    label = "always accessible (public space)";
  } else if (p.type === "park") {
    window = PARK_HOURS;
    label = "07:00-21:00 daily (park default)";
  }
  log("Hours missing (assumed)", `${p.id} ${p.name} [${p.type}] → ${label}`);
  return { weekly: everyDay(window), confidence: "assumed", raw: null };
}

function normalizeDuration(p: RawPlace) {
  if (p.duration_minutes && p.duration_minutes > 0) return { minutes: p.duration_minutes, assumed: false };
  const minutes = durationByType.get(p.type) ?? DEFAULT_DURATION;
  log("Duration missing (assumed median for type)", `${p.id} ${p.name} [${p.type}] → ${minutes} min`);
  return { minutes, assumed: true };
}

function normalizeLocation(p: RawPlace) {
  const centre = cityCentre.get(p.city)!;
  const km = distanceKm(p.latitude, p.longitude, centre.lat, centre.lng);
  if (km <= MAX_KM_FROM_CITY) return { lat: p.latitude, lng: p.longitude, approximate: false };

  // Snap to another place in the same neighbourhood, else to the city centre.
  const neighbour = raw.find(
    (o) =>
      o.id !== p.id &&
      o.city === p.city &&
      o.neighborhood &&
      o.neighborhood === p.neighborhood &&
      distanceKm(o.latitude, o.longitude, centre.lat, centre.lng) <= MAX_KM_FROM_CITY,
  );
  const fix = neighbour ? { lat: neighbour.latitude, lng: neighbour.longitude } : centre;
  log(
    "Coordinates corrected",
    `${p.id} ${p.name}: (${p.latitude}, ${p.longitude}) is ${km.toFixed(0)} km from ${p.city} → ` +
      (neighbour ? `moved to ${neighbour.name} (same neighbourhood "${p.neighborhood}")` : `moved to ${p.city} centre`) +
      `; marked approximate`,
  );
  return { ...fix, approximate: true };
}

function normalizeBooking(p: RawPlace): Place["booking"] {
  if (p.booking_required === null) {
    log("Booking requirement unknown", `${p.id} ${p.name}: shown as "check before you go"`);
    return "unknown";
  }
  return p.booking_required ? "required" : "not-required";
}

// ---------- build ----------

const places: Place[] = raw.map((p) => {
  const loc = normalizeLocation(p);
  const seasonal = parseSeasonal(p.seasonal_notes);
  if (p.seasonal_notes) {
    const rules = [
      seasonal.openMonths && `open months ${seasonal.openMonths.join(",")} (hard)`,
      seasonal.bestMonths && `best months ${seasonal.bestMonths.join(",")} (soft)`,
      seasonal.bookingMonths && `booking required in months ${seasonal.bookingMonths.join(",")}`,
      seasonal.thirdWeekendOnly && "third weekend of the month only",
    ].filter(Boolean);
    log(
      "Seasonal notes",
      `${p.id} ${p.name}: "${p.seasonal_notes}" → ${rules.length ? rules.join("; ") : "shown as a note only"}`,
    );
  }
  const excludedReason = p.rating < MIN_RATING ? `Rated ${p.rating}, below the ${MIN_RATING} floor` : null;
  if (excludedReason) log("Excluded from automatic planning", `${p.id} ${p.name}: ${excludedReason}`);

  return {
    id: p.id,
    name: p.name,
    type: p.type,
    city: p.city,
    region: p.region,
    neighborhood: p.neighborhood,
    description: p.description,
    lat: loc.lat,
    lng: loc.lng,
    locationApproximate: loc.approximate,
    hours: normalizeHours(p),
    duration: normalizeDuration(p),
    price: p.price_range.length,
    rating: p.rating,
    tags: normalizeTags(p),
    booking: normalizeBooking(p),
    seasonal,
    startWindow: startWindow(p),
    siteGroup: null,
    excludedReason,
  };
});

// Places at the same coordinates are the same site; the planner schedules at most one.
// Corrected (approximate) locations are skipped: they only coincide because we moved them.
for (const a of places) {
  if (a.siteGroup || a.locationApproximate) continue;
  const twins = places.filter(
    (b) =>
      b !== a &&
      !b.siteGroup &&
      !b.locationApproximate &&
      distanceKm(a.lat, a.lng, b.lat, b.lng) * 1000 < SAME_SITE_METERS,
  );
  if (!twins.length) continue;
  a.siteGroup = a.id;
  for (const t of twins) t.siteGroup = a.id;
  log("Same site (at most one scheduled per trip)", [a, ...twins].map((x) => `${x.id} ${x.name}`).join(" ↔ "));
}

// Visits longer than any opening (e.g. a 240-min tasting menu in a 90-min lunch service).
for (const p of places) {
  if (p.hours.confidence !== "listed") continue;
  const longest = Math.max(...DAYS.flatMap((d) => p.hours.weekly[d]).map((i) => i.close - i.open));
  if (p.duration.minutes > longest)
    log(
      "Duration longer than opening hours (left as is)",
      `${p.id} ${p.name}: ${p.duration.minutes}-min visit vs longest opening ${longest} min` +
        (p.type === "restaurant" ? " — restaurants are scheduled by seating time, so this still works" : ""),
    );
}

// Tags that contradict the hours: reported, not changed.
for (const p of places) {
  if (p.hours.confidence !== "listed") continue;
  const intervals = DAYS.flatMap((d) => p.hours.weekly[d]);
  const latestClose = Math.max(...intervals.map((i) => i.close));
  const earliestOpen = Math.min(...intervals.map((i) => i.open));
  if (p.tags.includes("evening") && latestClose <= 18 * 60)
    log("Tag contradicts hours (left as is)", `${p.id} ${p.name}: tagged "evening" but closes by 18:00`);
  if (p.tags.includes("morning") && earliestOpen >= 12 * 60)
    log("Tag contradicts hours (left as is)", `${p.id} ${p.name}: tagged "morning" but opens after noon`);
}

writeFileSync(OUT_PATH, JSON.stringify(places, null, 2) + "\n");

const counts = {
  listed: places.filter((p) => p.hours.confidence === "listed").length,
  inferred: places.filter((p) => p.hours.confidence === "inferred").length,
  assumed: places.filter((p) => p.hours.confidence === "assumed").length,
};
const md = [
  "# Normalization report",
  "",
  `Generated by \`scripts/normalize.ts\` from \`${RAW_PATH}\`. ${raw.length} places in, ${places.length} out ` +
    `(${places.filter((p) => p.excludedReason).length} kept but excluded from automatic planning).`,
  "",
  `Hours confidence: ${counts.listed} listed, ${counts.inferred} inferred, ${counts.assumed} assumed.`,
  "",
  ...Object.entries(report).flatMap(([section, lines]) => [`## ${section} (${lines.length})`, "", ...lines.map((l) => `- ${l}`), ""]),
].join("\n");
writeFileSync(REPORT_PATH, md);

console.log(`Wrote ${OUT_PATH} (${places.length} places) and ${REPORT_PATH}`);
for (const [section, lines] of Object.entries(report)) console.log(`  ${section}: ${lines.length}`);
