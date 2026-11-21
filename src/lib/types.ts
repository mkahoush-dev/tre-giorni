// Shared data model. `RawPlace` is italy.json as delivered; `Place` is what the
// normalize script produces and what the rest of the app consumes.

export interface RawPlace {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  neighborhood: string | null;
  description: string;
  latitude: number;
  longitude: number;
  hours: string | null;
  duration_minutes: number | null;
  price_range: string;
  rating: number;
  tags: string[];
  seasonal_notes: string | null;
  booking_required: boolean | null;
}

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];

/** Minutes since midnight. `close` may exceed 1440 when a place closes after midnight. */
export interface Interval {
  open: number;
  close: number;
}

export type WeeklyHours = Record<Day, Interval[]>;

/**
 * How much we trust the hours:
 * - listed:   parsed from an explicit schedule ("Tues-Sun 9:00-19:00")
 * - inferred: interpreted from vague text ("Evenings", "Morning only")
 * - assumed:  no hours given; a default for the place type was applied
 */
export type Confidence = "listed" | "inferred" | "assumed";

export interface Hours {
  weekly: WeeklyHours;
  confidence: Confidence;
  raw: string | null;
}

export interface Seasonal {
  /** Months (1-12) the place operates at all. null = all year. Hard constraint. */
  openMonths: number[] | null;
  /** Months it is at its best. Soft preference only. */
  bestMonths: number[] | null;
  /** Only open on the third weekend (Sat+Sun) of the month. */
  thirdWeekendOnly: boolean;
  /** Months in which booking becomes mandatory even if `booking` says otherwise. */
  bookingMonths: number[] | null;
  /** Original note, always shown to the user. */
  note: string | null;
}

export interface Place {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  neighborhood: string | null;
  description: string;
  lat: number;
  lng: number;
  locationApproximate: boolean;
  hours: Hours;
  duration: { minutes: number; assumed: boolean };
  /** 1-4, from "€" .. "€€€€" */
  price: number;
  rating: number;
  tags: string[];
  booking: "required" | "not-required" | "unknown";
  seasonal: Seasonal;
  /** Time-of-day window implied by the name ("at Dawn", "by Night"). Visit start must fall inside. */
  startWindow: { earliest: number; latest: number } | null;
  /** Places at the same physical spot; the planner schedules at most one per group. */
  siteGroup: string | null;
  /** Set when the place is kept in the data but never auto-scheduled. */
  excludedReason: string | null;
}
