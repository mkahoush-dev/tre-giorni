import type { Day } from "../types";

/** What the user can rank, most important first. */
export type Priority = "interests" | "rating" | "hidden" | "budget" | "walking";
export const PRIORITIES: Priority[] = ["interests", "rating", "hidden", "budget", "walking"];
export const DEFAULT_PRIORITIES: Priority[] = ["interests", "rating", "hidden", "walking", "budget"];

export type Interest = "food" | "art" | "history" | "views" | "wine" | "outdoors" | "evenings" | "shopping";
export type Pace = "relaxed" | "balanced" | "packed";
export type Hub = "Rome" | "Florence" | "Milan" | "Venice" | "Bologna";

export interface TripInput {
  /** First day of the trip, "YYYY-MM-DD". */
  startDate: string;
  interests: Interest[];
  priorities: Priority[];
  pace: Pace;
  /** Highest price level allowed, 1 (€) .. 4 (€€€€). */
  maxPrice: number;
  /** Place ids that must appear in the plan. */
  mustSee: string[];
  /** Place ids kept on a specific day when regenerating. */
  locked?: { placeId: string; day: number }[];
  /** Place ids shown last time; down-ranked so "Regenerate" gives something new. */
  exclude?: string[];
}

export interface Route {
  /** City for each of the 3 days. A change between days means a train at the start of that day. */
  dayCities: [Hub, Hub, Hub];
  label: string;
  score: number;
  rushed: boolean;
  /** Total minutes on trains between cities. */
  trainMinutes: number;
  /** Names of the best-scoring places this route reaches, so options can be compared. */
  highlights: string[];
}

export type Slot = "activity" | "lunch" | "dinner" | "evening";

export type Flag =
  | "book-ahead"
  | "booking-unknown"
  | "hours-inferred"
  | "hours-assumed"
  | "duration-assumed"
  | "location-approximate"
  | "outside-best-months";

export interface Visit {
  kind: "visit";
  placeId: string;
  start: number;
  end: number;
  slot: Slot;
  reasons: string[];
  flags: Flag[];
  mustSee: boolean;
  locked: boolean;
}

export interface Travel {
  kind: "travel";
  mode: "walk" | "transit" | "train";
  from: string;
  to: string;
  start: number;
  end: number;
}

export type Item = Visit | Travel;

export interface DayPlan {
  date: string;
  weekday: Day;
  city: Hub;
  items: Item[];
}

export type ConflictKind =
  | "closed-that-day"
  | "out-of-season"
  | "too-many-cities"
  | "day-overfull"
  | "not-in-route"
  | "day-trip-needs-full-day";

export interface Conflict {
  kind: ConflictKind;
  placeId?: string;
  message: string;
}

export interface Itinerary {
  route: Route;
  days: DayPlan[];
  conflicts: Conflict[];
}
