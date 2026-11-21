import type { Hub, Interest, Pace, Slot } from "./types";

export const HUBS: Hub[] = ["Rome", "Florence", "Milan", "Venice", "Bologna"];

/** Typical fastest train times in minutes between hubs. Estimates, always labelled as such in the UI. */
const TRAIN: Record<string, number> = {
  "Rome|Florence": 95,
  "Rome|Bologna": 140,
  "Rome|Milan": 180,
  "Rome|Venice": 240,
  "Florence|Bologna": 37,
  "Florence|Milan": 115,
  "Florence|Venice": 125,
  "Bologna|Milan": 65,
  "Bologna|Venice": 90,
  "Milan|Venice": 145,
};

export function trainMinutes(a: Hub, b: Hub): number {
  if (a === b) return 0;
  return TRAIN[`${a}|${b}`] ?? TRAIN[`${b}|${a}`];
}

/** Longest train ride we consider reasonable inside a 3-day trip. */
export const MAX_TRAIN_MINUTES = 150;

/** Day-trip towns: which hub they are reached from, and one-way travel time in minutes (estimate). */
export const DAY_TRIPS: Record<string, { hub: Hub; minutes: number }> = {
  Siena: { hub: "Florence", minutes: 75 },
  Pienza: { hub: "Florence", minutes: 120 },
  Modena: { hub: "Bologna", minutes: 30 },
  Maranello: { hub: "Bologna", minutes: 50 },
  Parma: { hub: "Bologna", minutes: 60 },
  Como: { hub: "Milan", minutes: 40 },
  Bellagio: { hub: "Milan", minutes: 100 },
  Lenno: { hub: "Milan", minutes: 110 },
  Burano: { hub: "Venice", minutes: 45 },
  Padua: { hub: "Venice", minutes: 30 },
  "Isola della Scala": { hub: "Venice", minutes: 120 },
};

export function hubOf(city: string): Hub | null {
  if ((HUBS as string[]).includes(city)) return city as Hub;
  return DAY_TRIPS[city]?.hub ?? null;
}

export const INTEREST_TAGS: Record<Interest, string[]> = {
  food: ["food", "market"],
  art: ["art"],
  history: ["historic", "cultural"],
  views: ["views", "scenic"],
  wine: ["wine"],
  outdoors: ["outdoors", "active"],
  evenings: ["evening", "romantic"],
  shopping: ["shop", "market"],
};

export const INTEREST_LABELS: Record<Interest, string> = {
  food: "Food",
  art: "Art",
  history: "History",
  views: "Views",
  wine: "Wine",
  outdoors: "Outdoors",
  evenings: "Evenings",
  shopping: "Shopping",
};

// ---- Day shape (minutes since midnight) ----
export const DAY_START = 9 * 60;
export const DAY_END = 22 * 60 + 30;
export const LUNCH = { earliest: 12 * 60 + 30, latest: 14 * 60 };
export const DINNER = { earliest: 19 * 60 + 30, latest: 21 * 60 };
/** Visits at least this long cover lunch (the user eats on the way). */
export const LONG_VISIT = 240;

/** The order of slots in a day, per pace. */
export const DAY_TEMPLATE: Record<Pace, Slot[]> = {
  relaxed: ["activity", "lunch", "activity", "activity", "dinner"],
  balanced: ["activity", "activity", "lunch", "activity", "activity", "dinner"],
  packed: ["activity", "activity", "lunch", "activity", "activity", "activity", "dinner", "evening"],
};

export const MEAL_TYPES = new Set(["restaurant", "cafe", "market"]);
/** A café or market only counts as a meal if the visit is at least this long (no gelato lunches). */
export const MIN_MEAL_MINUTES = 45;
/** Activities must end this many minutes after the earliest meal time, leaving room to get there. */
export const MEAL_BUFFER = 30;
/** Score multiplier for each place of the same type already on the same day. */
export const VARIETY_FACTOR = 0.85;
/** A day-trip on the day you arrive by train is only allowed when the train is this short. */
export const MAX_TRAIN_BEFORE_EXCURSION = 60;
/** Longest idle wait an activity slot accepts (e.g. waiting for an evening-only place to "open"). */
export const MAX_ACTIVITY_WAIT = 60;

// ---- Travel inside a city ----
export const DETOUR_FACTOR = 1.3;
export const WALK_KMH = 4.5;
export const MAX_WALK_KM = 2.5;
export const TRANSIT_OVERHEAD_MIN = 10;
export const TRANSIT_KMH = 18;

export const MIN_RATING_SIGNAL = 3.5;
export const ASSUMED_HOURS_PENALTY = 0.9;
export const TIME_OF_DAY_BONUS = 0.05;
export const EXCLUDED_PENALTY = 0.3;
