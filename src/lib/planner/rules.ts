import { isOpenFor } from "../parse-hours";
import { DAYS, type Day, type Place } from "../types";
import type { Flag } from "./types";

/** A calendar day of the trip. Dates are handled in UTC so the user's timezone cannot shift weekdays. */
export interface TripDate {
  iso: string;
  weekday: Day;
  month: number;
  dayOfMonth: number;
}

export function tripDates(startIso: string, count = 3): TripDate[] {
  const [y, m, d] = startIso.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    const jsDay = date.getUTCDay(); // 0 = Sunday
    return {
      iso: date.toISOString().slice(0, 10),
      weekday: DAYS[(jsDay + 6) % 7],
      month: date.getUTCMonth() + 1,
      dayOfMonth: date.getUTCDate(),
    };
  });
}

/** Third Saturday of the month and the Sunday after it. */
export function isThirdWeekend(date: TripDate): boolean {
  if (date.weekday === "sat") return date.dayOfMonth >= 15 && date.dayOfMonth <= 21;
  if (date.weekday === "sun") return date.dayOfMonth >= 16 && date.dayOfMonth <= 22;
  return false;
}

/** Can this place run at all on this date (ignoring time of day)? Returns the reason if not. */
export function dateBlocker(place: Place, date: TripDate): "out-of-season" | "closed-that-day" | null {
  const s = place.seasonal;
  if (s.openMonths && !s.openMonths.includes(date.month)) return "out-of-season";
  if (s.thirdWeekendOnly && !isThirdWeekend(date)) return "closed-that-day";
  if (place.hours.weekly[date.weekday].length === 0) return "closed-that-day";
  return null;
}

export interface Eligibility {
  maxPrice: number;
  /** Must-sees bypass the price ceiling and rating floor: the user asked for them. */
  mustSee: boolean;
}

/** Rules that never bend for automatic picks. */
export function isEligible(place: Place, e: Eligibility): boolean {
  if (e.mustSee) return true;
  if (place.excludedReason) return false;
  if (place.price > e.maxPrice) return false;
  return true;
}

/** Restaurant hours are seating times: you must arrive this long before the kitchen closes. */
export const LAST_SEATING_MIN = 45;
/** Places tagged "evening" (and not "morning") are not started before this time. */
export const EVENING_NOT_BEFORE = 18 * 60;

/**
 * Is the place open for this visit on this date?
 * - Restaurants: arrival must fall inside a service, at least LAST_SEATING_MIN before it ends.
 * - Everything else: the whole visit must fit inside one opening.
 */
export function fitsTime(place: Place, date: TripDate, start: number): boolean {
  if (dateBlocker(place, date)) return false;
  if (place.startWindow && (start < place.startWindow.earliest || start > place.startWindow.latest)) return false;
  if (place.tags.includes("evening") && !place.tags.includes("morning") && start < EVENING_NOT_BEFORE) return false;
  if (place.type === "restaurant") {
    return place.hours.weekly[date.weekday].some((iv) => start >= iv.open && start <= iv.close - LAST_SEATING_MIN);
  }
  return isOpenFor(place.hours.weekly, date.weekday, start, place.duration.minutes);
}

/** Things the user should know or do before visiting. */
export function flagsFor(place: Place, date: TripDate): Flag[] {
  const flags: Flag[] = [];
  const bookingSeason = place.seasonal.bookingMonths?.includes(date.month);
  if (place.booking === "required" || bookingSeason) flags.push("book-ahead");
  if (place.booking === "unknown") flags.push("booking-unknown");
  if (place.hours.confidence === "inferred") flags.push("hours-inferred");
  if (place.hours.confidence === "assumed") flags.push("hours-assumed");
  if (place.duration.assumed) flags.push("duration-assumed");
  if (place.locationApproximate) flags.push("location-approximate");
  if (place.seasonal.bestMonths && !place.seasonal.bestMonths.includes(date.month)) flags.push("outside-best-months");
  return flags;
}
