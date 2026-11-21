import type { Place } from "../types";
import {
  DAY_END,
  DAY_START,
  DAY_TEMPLATE,
  DAY_TRIPS,
  DINNER,
  LONG_VISIT,
  LUNCH,
  MAX_ACTIVITY_WAIT,
  MEAL_BUFFER,
  MEAL_TYPES,
  MIN_MEAL_MINUTES,
  VARIETY_FACTOR,
  trainMinutes,
} from "./constants";
import { EVENING_NOT_BEFORE, fitsTime, flagsFor, isEligible, type TripDate } from "./rules";
import { scorePlace } from "./score";
import { cityTravel, type Point } from "./travel";
import type { DayPlan, Hub, Item, Slot, TripInput, Visit } from "./types";

export interface PlanContext {
  input: TripInput;
  places: Place[];
  byId: Map<string, Place>;
  /** Place ids taken anywhere in the trip, and same-site groups already used. */
  used: Set<string>;
  usedSites: Set<string>;
  /** Pinned places for any day; auto-picks must not take them. */
  reserved: Set<string>;
  mustSee: Set<string>;
  locked: Set<string>;
  exclude: Set<string>;
}

export interface DayRequest {
  dayIndex: number;
  date: TripDate;
  city: Hub;
  arrivingFrom: Hub | null;
  pinned: Place[];
}

/** Median position of the places in a city: our stand-in for "your hotel". */
export function centreOf(places: Place[], city: string): Point {
  const inCity = places.filter((p) => p.city === city && !p.locationApproximate);
  const mid = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  return { lat: mid(inCity.map((p) => p.lat)), lng: mid(inCity.map((p) => p.lng)) };
}

/** Which places may fill a slot of this kind. */
export function fitsSlot(place: Place, slot: Slot): boolean {
  switch (slot) {
    case "lunch":
    case "dinner":
      if (place.type === "restaurant") return true;
      return MEAL_TYPES.has(place.type) && place.tags.includes("food") && place.duration.minutes >= MIN_MEAL_MINUTES;
    case "activity":
      return place.type !== "restaurant";
    case "evening":
      return place.type !== "restaurant" && place.tags.includes("evening");
  }
}

interface Candidate {
  place: Place;
  start: number;
  travel: { mode: "walk" | "transit"; minutes: number };
  score: number;
  reasons: string[];
}

/**
 * Greedy day builder. Walks the pace template slot by slot; for each slot it
 * takes a pinned place if one fits, otherwise the best-scoring feasible place.
 */
export function buildDay(req: DayRequest, ctx: PlanContext): { day: DayPlan; unplaced: Place[] } {
  const items: Item[] = [];
  const pending = [...req.pinned];
  let cursor = DAY_START;
  let here: Point = centreOf(ctx.places, req.city);
  let hereName: string | null = null;
  let context: string = req.city;

  const addTrain = (from: string, to: string, minutes: number) => {
    items.push({ kind: "travel", mode: "train", from, to, start: cursor, end: cursor + minutes });
    cursor += minutes;
  };

  if (req.arrivingFrom) {
    addTrain(req.arrivingFrom, req.city, trainMinutes(req.arrivingFrom, req.city));
    cursor += 15; // drop bags, find the exit
  }

  // A pinned place in a day-trip town turns this into an excursion day.
  const excursionTown = pending.find((p) => DAY_TRIPS[p.city])?.city ?? null;
  if (excursionTown) {
    addTrain(req.city, excursionTown, DAY_TRIPS[excursionTown].minutes);
    context = excursionTown;
    here = centreOf(ctx.places, excursionTown);
  }

  const returnFromExcursion = () => {
    if (context === req.city || !excursionTown) return;
    addTrain(excursionTown, req.city, DAY_TRIPS[excursionTown].minutes);
    context = req.city;
    here = centreOf(ctx.places, req.city);
    hereName = null;
  };

  const template = DAY_TEMPLATE[ctx.input.pace];
  let lunchDone = false;

  for (let i = 0; i < template.length; i++) {
    const slot = template[i];
    if (slot === "lunch" && lunchDone) continue;
    if (slot === "lunch" && cursor > LUNCH.latest) continue;

    const nextMeal = template.slice(i + 1).find((s) => s === "lunch" || s === "dinner");
    const deadline =
      nextMeal === "lunch" && !lunchDone
        ? LUNCH.earliest + MEAL_BUFFER
        : nextMeal === "dinner"
          ? DINNER.earliest + MEAL_BUFFER
          : DAY_END;

    const pick = bestCandidate(slot, deadline, { cursor, here, hereName, context, pending, items }, req, ctx);
    if (!pick) {
      if (slot === "lunch") lunchDone = true;
      continue;
    }

    place(pick, slot);
    if (slot === "lunch" || pick.place.duration.minutes >= LONG_VISIT) lunchDone = true;

    // Leave the day-trip town once its pinned places are done.
    if (context !== req.city && !pending.some((p) => p.city === context)) returnFromExcursion();
  }
  returnFromExcursion();

  // Pinned places the template could not fit: try once more anywhere later in the day.
  for (const p of [...pending]) {
    const slot: Slot = p.type === "restaurant" ? "dinner" : p.tags.includes("evening") ? "evening" : "activity";
    const pick = bestCandidate(slot, DAY_END, { cursor, here, hereName, context, pending: [p], items }, req, ctx, true);
    if (pick) place(pick, slot);
  }

  return {
    day: { date: req.date.iso, weekday: req.date.weekday, city: req.city, items },
    unplaced: pending,
  };

  function place(c: Candidate, slot: Slot) {
    if (c.travel.minutes > 0 && hereName) {
      items.push({ kind: "travel", mode: c.travel.mode, from: hereName, to: c.place.name, start: cursor, end: cursor + c.travel.minutes });
    }
    const visit: Visit = {
      kind: "visit",
      placeId: c.place.id,
      start: c.start,
      end: c.start + c.place.duration.minutes,
      slot,
      reasons: reasonsFor(c, ctx),
      flags: flagsFor(c.place, req.date),
      mustSee: ctx.mustSee.has(c.place.id),
      locked: ctx.locked.has(c.place.id),
    };
    items.push(visit);
    cursor = visit.end;
    here = c.place;
    hereName = c.place.name;
    ctx.used.add(c.place.id);
    if (c.place.siteGroup) ctx.usedSites.add(c.place.siteGroup);
    const idx = pending.indexOf(c.place);
    if (idx >= 0) pending.splice(idx, 1);
  }
}

function reasonsFor(c: Candidate, ctx: PlanContext): string[] {
  if (ctx.locked.has(c.place.id)) return ["Locked by you", ...c.reasons].slice(0, 2);
  if (ctx.mustSee.has(c.place.id)) return ["Your must-see", ...c.reasons].slice(0, 2);
  return c.reasons;
}

interface Position {
  cursor: number;
  here: Point;
  hereName: string | null;
  context: string;
  pending: Place[];
  items: Item[];
}

function bestCandidate(
  slot: Slot,
  deadline: number,
  pos: Position,
  req: DayRequest,
  ctx: PlanContext,
  pinnedOnly = false,
): Candidate | null {
  const evaluate = (place: Place): Candidate | null => {
    if (!fitsSlot(place, slot)) return null;
    const travel = pos.hereName ? cityTravel(pos.here, place) : { mode: "walk" as const, minutes: 0 };
    let start = pos.cursor + travel.minutes;
    if (slot === "lunch") start = Math.max(start, LUNCH.earliest);
    if (slot === "dinner") start = Math.max(start, DINNER.earliest);
    // Evening-only places wait for the evening rather than being rejected, but an
    // activity slot won't sit idle for long: that time is better spent elsewhere.
    if (place.tags.includes("evening") && !place.tags.includes("morning")) {
      const waited = Math.max(start, EVENING_NOT_BEFORE);
      if (slot === "activity" && !pinnedOnly && waited - start > MAX_ACTIVITY_WAIT) return null;
      start = waited;
    }
    if (slot === "lunch" && start > LUNCH.latest) return null;
    if (slot === "dinner" && start > DINNER.latest) return null;

    // Meals: if the restaurant opens later within the meal window, arrive when it opens.
    if (slot === "lunch" || slot === "dinner") {
      const latest = slot === "lunch" ? LUNCH.latest : DINNER.latest;
      const opening = place.hours.weekly[req.date.weekday].find((iv) => iv.open > start && iv.open <= latest);
      if (!fitsTime(place, req.date, start) && opening) start = opening.open;
    }
    // A name-implied window ("at Night") likewise moves the start rather than ruling the place out.
    if (place.startWindow && start < place.startWindow.earliest) {
      if (slot === "activity" && !pinnedOnly && place.startWindow.earliest - start > MAX_ACTIVITY_WAIT) return null;
      start = place.startWindow.earliest;
    }

    const end = start + place.duration.minutes;
    const limit = slot === "activity" && place.duration.minutes >= LONG_VISIT ? DINNER.earliest + MEAL_BUFFER : deadline;
    if (slot === "activity" && end > limit) return null;
    if (end > 24 * 60) return null;
    if (!fitsTime(place, req.date, start)) return null;

    const s = scorePlace(place, {
      interests: ctx.input.interests,
      priorities: ctx.input.priorities,
      travelMinutes: pos.hereName ? travel.minutes : null,
      previousName: pos.hereName,
      start,
      exclude: ctx.exclude,
    });
    const sameTypeToday = pos.items.filter((it) => it.kind === "visit" && ctx.byId.get(it.placeId)?.type === place.type).length;
    return { place, start, travel, score: s.total * VARIETY_FACTOR ** sameTypeToday, reasons: s.reasons };
  };

  const rank = (cs: (Candidate | null)[]) =>
    cs
      .filter((c): c is Candidate => c !== null)
      .sort((a, b) => b.score - a.score || a.place.id.localeCompare(b.place.id))[0] ?? null;

  // 1. A pinned place that fits now always wins.
  const pinned = rank(pos.pending.filter((p) => p.city === pos.context).map(evaluate));
  if (pinned || pinnedOnly) return pinned;

  // 2. Otherwise the best automatic pick in the current city (or day-trip town).
  const pool = ctx.places.filter(
    (p) =>
      p.city === pos.context &&
      !ctx.used.has(p.id) &&
      !ctx.reserved.has(p.id) &&
      !(p.siteGroup && ctx.usedSites.has(p.siteGroup)) &&
      isEligible(p, { maxPrice: ctx.input.maxPrice, mustSee: false }),
  );
  return rank(pool.map(evaluate));
}
