import type { Place } from "../types";
import { DAY_TEMPLATE, DAY_TRIPS, HUBS, MAX_TRAIN_BEFORE_EXCURSION, MAX_TRAIN_MINUTES, hubOf, trainMinutes } from "./constants";
import { dateBlocker, fitsTime, flagsFor, isEligible, tripDates, type TripDate } from "./rules";
import { buildDay, fitsSlot, type PlanContext } from "./schedule";
import { scorePlace } from "./score";
import { cityTravel } from "./travel";
import type { Conflict, DayPlan, Hub, Item, Itinerary, Route, TripInput, Visit } from "./types";

const DAY_NAMES: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

// ---------------------------------------------------------------- routes

function requiredHubs(input: TripInput, byId: Map<string, Place>): Hub[] {
  const hubs = input.mustSee.map((id) => byId.get(id)).map((p) => (p ? hubOf(p.city) : null));
  return [...new Set(hubs.filter((h): h is Hub => h !== null))];
}

function candidateRoutes(required: Hub[], onlyCities?: Hub[]): [Hub, Hub, Hub][] {
  const hubs = onlyCities?.length ? onlyCities : HUBS;
  const out: [Hub, Hub, Hub][] = [];
  const near = (a: Hub, b: Hub) => trainMinutes(a, b) <= MAX_TRAIN_MINUTES;

  for (const a of hubs) {
    out.push([a, a, a]);
    for (const b of hubs) {
      if (a === b || !near(a, b)) continue;
      out.push([a, a, b], [a, b, b]);
      // Three cities only when must-sees (or the user's own city list) demand it.
      if (required.length < 3 && (onlyCities?.length ?? 0) < 3) continue;
      for (const c of hubs) if (c !== a && c !== b && near(b, c)) out.push([a, b, c]);
    }
  }
  const wanted = onlyCities?.length ? onlyCities : required;
  return out.filter((r) => wanted.every((h) => r.includes(h)));
}

function routeLabel(days: Hub[]): string {
  const counts = new Map<Hub, number>();
  for (const d of days) counts.set(d, (counts.get(d) ?? 0) + 1);
  if (counts.size === 1) return `${days[0]} · 3 days`;
  return [...counts].map(([city, n]) => `${city} ${n} day${n > 1 ? "s" : ""}`).join(" → ");
}

/** A must-see that no day of the route can host costs more than any amount of good places can make up. */
const UNSCHEDULABLE_PENALTY = 100;

/** Can a day of this route host this place? (right city, open that date, excursion rules) */
function dayCanHost(p: Place, days: Hub[], i: number, date: TripDate): boolean {
  if (days[i] !== hubOf(p.city)) return false;
  if (dateBlocker(p, date)) return false;
  const arrivingFrom = i > 0 && days[i - 1] !== days[i] ? days[i - 1] : null;
  if (DAY_TRIPS[p.city] && arrivingFrom && trainMinutes(arrivingFrom, days[i]) > MAX_TRAIN_BEFORE_EXCURSION) return false;
  return true;
}

/**
 * Quick estimate of how good a route is: the best places each day could get
 * (counting only places open on that date), minus train time, minus a heavy
 * penalty for must-sees the route cannot fit.
 */
function scoreRoute(
  days: [Hub, Hub, Hub],
  input: TripInput,
  places: Place[],
  byId: Map<string, Place>,
): { score: number; picks: string[] } {
  const dates = tripDates(input.startDate);
  const perDay = DAY_TEMPLATE[input.pace].length;
  const taken = new Set<string>();
  const picked: { id: string; s: number }[] = [];
  let total = 0;
  for (const id of input.mustSee) {
    const p = byId.get(id);
    if (p && ![0, 1, 2].some((i) => dayCanHost(p, days, i, dates[i]))) total -= UNSCHEDULABLE_PENALTY;
  }
  days.forEach((city, i) => {
    const travelDay = i > 0 && days[i - 1] !== city;
    const k = Math.round(perDay * (travelDay ? 0.6 : 1));
    const best = places
      .filter(
        (p) =>
          p.city === city &&
          !taken.has(p.id) &&
          !dateBlocker(p, dates[i]) &&
          isEligible(p, { maxPrice: input.maxPrice, mustSee: false }),
      )
      .map((p) => ({
        id: p.id,
        s: scorePlace(p, {
          interests: input.interests,
          priorities: input.priorities,
          travelMinutes: null,
          previousName: null,
          start: 12 * 60,
          exclude: new Set(),
        }).total,
      }))
      .sort((a, b) => b.s - a.s || a.id.localeCompare(b.id))
      .slice(0, k);
    best.forEach((b) => taken.add(b.id));
    picked.push(...best);
    total += best.reduce((sum, b) => sum + b.s, 0);
    if (travelDay) total -= (trainMinutes(days[i - 1], city) / 60) * 0.3;
  });
  const picks = picked.sort((a, b) => b.s - a.s || a.id.localeCompare(b.id)).map((b) => b.id);
  return { score: Math.round(total * 100) / 100, picks };
}

export function routeOptions(
  input: TripInput & { cities?: Hub[] },
  places: Place[],
): { options: Route[]; conflicts: Conflict[] } {
  const byId = new Map(places.map((p) => [p.id, p]));
  const required = requiredHubs(input, byId);
  if (required.length > 3) {
    return {
      options: [],
      conflicts: [{ kind: "too-many-cities", message: `Your must-sees span ${required.join(", ")}: that is more than 3 cities in 3 days. Remove one to continue.` }],
    };
  }
  const ranked = candidateRoutes(required, input.cities)
    .map((days) => ({ days, label: routeLabel(days), ...scoreRoute(days, input, places, byId) }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 3);

  // Highlights show what is distinctive about each option: its best picks that not every option shares.
  const shared = ranked.length > 1 ? new Set(ranked[0].picks.filter((id) => ranked.every((r) => r.picks.includes(id)))) : new Set<string>();
  const options: Route[] = ranked.map((r) => {
    const distinct = r.picks.filter((id) => !shared.has(id));
    return {
      dayCities: r.days,
      label: r.label,
      score: r.score,
      rushed: new Set(r.days).size === 3,
      trainMinutes: trainMinutes(r.days[0], r.days[1]) + trainMinutes(r.days[1], r.days[2]),
      highlights: (distinct.length ? distinct : r.picks).slice(0, 3).map((id) => byId.get(id)!.name),
    };
  });
  return { options, conflicts: [] };
}

// ---------------------------------------------------------------- planning

/** Build a 3-day itinerary for a chosen route. Deterministic: same input, same plan. */
export function plan(input: TripInput, route: Route, places: Place[]): Itinerary {
  const byId = new Map(places.map((p) => [p.id, p]));
  const dates = tripDates(input.startDate);
  const conflicts: Conflict[] = [];

  const locked = input.locked ?? [];
  const ctx: PlanContext = {
    input,
    places,
    byId,
    used: new Set(),
    usedSites: new Set(),
    reserved: new Set([...input.mustSee, ...locked.map((l) => l.placeId)]),
    mustSee: new Set(input.mustSee),
    locked: new Set(locked.map((l) => l.placeId)),
    exclude: new Set(input.exclude ?? []),
  };

  const pinnedByDay: Place[][] = [[], [], []];
  for (const l of locked) {
    const p = byId.get(l.placeId);
    if (p && pinnedByDay[l.day]) pinnedByDay[l.day].push(p);
  }
  assignMustSees(input, route, dates, byId, pinnedByDay, conflicts, ctx.locked);

  const days: DayPlan[] = route.dayCities.map((city, i) => {
    const { day, unplaced } = buildDay(
      { dayIndex: i, date: dates[i], city, arrivingFrom: i > 0 && route.dayCities[i - 1] !== city ? route.dayCities[i - 1] : null, pinned: pinnedByDay[i] },
      ctx,
    );
    for (const p of unplaced) {
      conflicts.push({ kind: "day-overfull", placeId: p.id, message: `${p.name} didn't fit on ${DAY_NAMES[dates[i].weekday]} around its opening hours. Try removing a stop that day or a slower pace.` });
    }
    return day;
  });

  return { route, days, conflicts };
}

function assignMustSees(
  input: TripInput,
  route: Route,
  dates: TripDate[],
  byId: Map<string, Place>,
  pinnedByDay: Place[][],
  conflicts: Conflict[],
  locked: Set<string>,
) {
  const musts = input.mustSee.map((id) => byId.get(id)).filter((p): p is Place => !!p && !locked.has(p.id));

  // Most constrained first: fewer possible days get assigned before flexible ones.
  const options = musts.map((p) => {
    const hub = hubOf(p.city);
    const days = [0, 1, 2].filter((i) => dayCanHost(p, route.dayCities, i, dates[i]));
    return { p, hub, days };
  });
  options.sort((a, b) => a.days.length - b.days.length || a.p.id.localeCompare(b.p.id));

  for (const { p, hub, days } of options) {
    if (!hub || !route.dayCities.includes(hub)) {
      conflicts.push({ kind: "not-in-route", placeId: p.id, message: `${p.name} is in ${p.city}, which isn't on this route.` });
      continue;
    }
    if (!days.length) {
      // Open on a day in its hub, but every such day starts with a long train: say so, not "closed".
      const openOnSomeHubDay = route.dayCities.some((c, i) => c === hub && !dateBlocker(p, dates[i]));
      if (DAY_TRIPS[p.city] && openOnSomeHubDay) {
        conflicts.push({
          kind: "day-trip-needs-full-day",
          placeId: p.id,
          message: `${p.name} needs a full day out of ${hub}, but your only day there starts with a long train. Choose a route with more time in ${hub}.`,
        });
        continue;
      }
      const blocker = route.dayCities
        .map((c, i) => (c === hub ? dateBlocker(p, dates[i]) : null))
        .find(Boolean);
      const when = route.dayCities.map((c, i) => (c === hub ? DAY_NAMES[dates[i].weekday] : null)).filter(Boolean).join(" or ");
      conflicts.push(
        blocker === "out-of-season"
          ? { kind: "out-of-season", placeId: p.id, message: `${p.name} is closed in this season (${p.seasonal.note ?? "seasonal"}).` }
          : { kind: "closed-that-day", placeId: p.id, message: `${p.name} isn't open on ${when}. Try different dates or a different day in ${hub}.` },
      );
      continue;
    }
    // One day-trip town per day: prefer a day already going to the same town, else the lightest day.
    const town = DAY_TRIPS[p.city] ? p.city : null;
    const usable = days.filter((i) => {
      const dayTown = pinnedByDay[i].find((q) => DAY_TRIPS[q.city])?.city;
      return !town || !dayTown || dayTown === town;
    });
    const pool = usable.length ? usable : days;
    const best = [...pool].sort(
      (a, b) =>
        Number(!!town && pinnedByDay[b].some((q) => q.city === town)) - Number(!!town && pinnedByDay[a].some((q) => q.city === town)) ||
        pinnedByDay[a].length - pinnedByDay[b].length ||
        a - b,
    )[0];
    pinnedByDay[best].push(p);
  }
}

// ---------------------------------------------------------------- editing

function neighbours(day: DayPlan, itemIndex: number) {
  const visits = day.items.map((it, i) => ({ it, i })).filter((x) => x.it.kind === "visit") as { it: Visit; i: number }[];
  const pos = visits.findIndex((v) => v.i === itemIndex);
  return { prev: visits[pos - 1]?.it ?? null, next: visits[pos + 1]?.it ?? null };
}

export interface Alternative {
  place: Place;
  start: number;
  reasons: string[];
  score: number;
}

/** Up to 5 places that fit the same time slot without disturbing the rest of the day. */
export function alternativesFor(itin: Itinerary, input: TripInput, dayIndex: number, itemIndex: number, places: Place[]): Alternative[] {
  const day = itin.days[dayIndex];
  const current = day.items[itemIndex];
  if (!current || current.kind !== "visit") return [];
  const byId = new Map(places.map((p) => [p.id, p]));
  const date = tripDates(input.startDate)[dayIndex];
  const { prev, next } = neighbours(day, itemIndex);
  const prevPlace = prev ? byId.get(prev.placeId)! : null;
  const nextPlace = next ? byId.get(next.placeId)! : null;

  const usedIds = new Set(itin.days.flatMap((d) => d.items.filter((i): i is Visit => i.kind === "visit").map((v) => v.placeId)));
  const usedSites = new Set([...usedIds].map((id) => byId.get(id)?.siteGroup).filter(Boolean));
  const currentPlace = byId.get(current.placeId)!;
  const city = currentPlace.city;

  return places
    .filter(
      (p) =>
        p.city === city &&
        !usedIds.has(p.id) &&
        !(p.siteGroup && usedSites.has(p.siteGroup)) &&
        isEligible(p, { maxPrice: input.maxPrice, mustSee: false }) &&
        fitsSlot(p, current.slot),
    )
    .flatMap((p) => {
      const inbound = prevPlace ? cityTravel(prevPlace, p).minutes : 0;
      const start = Math.max(prev ? prev.end + inbound : current.start, current.slot === "lunch" || current.slot === "dinner" ? current.start : 0);
      const end = start + p.duration.minutes;
      const outbound = nextPlace ? cityTravel(p, nextPlace).minutes : 0;
      if (next && end + outbound > next.start) return [];
      if (!fitsTime(p, date, start)) return [];
      const s = scorePlace(p, {
        interests: input.interests,
        priorities: input.priorities,
        travelMinutes: prevPlace ? inbound : null,
        previousName: prevPlace?.name ?? null,
        start,
        exclude: new Set(),
      });
      return [{ place: p, start, reasons: s.reasons, score: s.total }];
    })
    .sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id))
    .slice(0, 5);
}

/** Rebuild walking/transit legs between consecutive visits (train legs are kept). */
function relink(items: Item[], byId: Map<string, Place>): Item[] {
  const out: Item[] = [];
  let last: Visit | null = null;
  for (const it of items) {
    if (it.kind === "travel") {
      if (it.mode === "train") {
        out.push(it);
        last = null;
      }
      continue;
    }
    if (last) {
      const a = byId.get(last.placeId)!;
      const b = byId.get(it.placeId)!;
      const t = cityTravel(a, b);
      out.push({ kind: "travel", mode: t.mode, from: a.name, to: b.name, start: last.end, end: last.end + t.minutes });
    }
    out.push(it);
    last = it;
  }
  return out;
}

function withDay(itin: Itinerary, dayIndex: number, items: Item[]): Itinerary {
  return { ...itin, days: itin.days.map((d, i) => (i === dayIndex ? { ...d, items } : d)) };
}

export function replaceVisit(itin: Itinerary, dayIndex: number, itemIndex: number, alt: Alternative, places: Place[]): Itinerary {
  const byId = new Map(places.map((p) => [p.id, p]));
  const day = itin.days[dayIndex];
  const old = day.items[itemIndex] as Visit;
  const date = tripDates(day.date)[0];
  const replacement: Visit = {
    ...old,
    placeId: alt.place.id,
    start: alt.start,
    end: alt.start + alt.place.duration.minutes,
    reasons: alt.reasons,
    flags: flagsFor(alt.place, date),
    mustSee: false,
    locked: false,
  };
  const items = day.items.map((it, i) => (i === itemIndex ? replacement : it));
  return withDay(itin, dayIndex, relink(items, byId));
}

export function removeVisit(itin: Itinerary, dayIndex: number, itemIndex: number, places: Place[]): Itinerary {
  const byId = new Map(places.map((p) => [p.id, p]));
  const items = itin.days[dayIndex].items.filter((_, i) => i !== itemIndex);
  return withDay(itin, dayIndex, relink(items, byId));
}

export function toggleLock(itin: Itinerary, dayIndex: number, itemIndex: number): Itinerary {
  const items = itin.days[dayIndex].items.map((it, i) => (i === itemIndex && it.kind === "visit" ? { ...it, locked: !it.locked } : it));
  return withDay(itin, dayIndex, items);
}

/** Re-plan everything that isn't locked, down-ranking what was just shown so the result changes. */
export function regenerate(itin: Itinerary, input: TripInput, places: Place[]): Itinerary {
  const visits = itin.days.flatMap((d, day) => d.items.filter((i): i is Visit => i.kind === "visit").map((v) => ({ v, day })));
  const locked = visits.filter((x) => x.v.locked).map((x) => ({ placeId: x.v.placeId, day: x.day }));
  const exclude = visits.filter((x) => !x.v.locked && !x.v.mustSee).map((x) => x.v.placeId);
  return plan({ ...input, locked, exclude }, itin.route, places);
}
