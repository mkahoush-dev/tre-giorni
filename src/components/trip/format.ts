import type { Flag } from "@/lib/planner/types";
import type { Place } from "@/lib/types";

export function clock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function price(level: number): string {
  return "€".repeat(level);
}

export const WEEKDAY: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** How a flag reads on the board. `solid` = verified fact you must act on; dashed = we are unsure. */
export const FLAG_LABEL: Record<Flag, { short: string; long: string; tone: "book" | "unsure" }> = {
  "book-ahead": { short: "Book ahead", long: "Booking required", tone: "book" },
  "booking-unknown": { short: "Booking ?", long: "Booking requirement not listed", tone: "unsure" },
  "hours-inferred": { short: "Hours approx.", long: "Hours interpreted from vague text", tone: "unsure" },
  "hours-assumed": { short: "Hours ?", long: "Hours not listed; assumed", tone: "unsure" },
  "duration-assumed": { short: "Time est.", long: "Visit length not listed; estimated", tone: "unsure" },
  "location-approximate": { short: "Location approx.", long: "Map position corrected; approximate", tone: "unsure" },
  "outside-best-months": { short: "Off-season", long: "Outside its best months", tone: "unsure" },
};

export const TYPE_LABEL: Record<string, string> = {
  historic_site: "Historic site",
  restaurant: "Restaurant",
  experience: "Experience",
  museum: "Museum",
  viewpoint: "Viewpoint",
  cafe: "Café",
  neighborhood: "Neighbourhood",
  market: "Market",
  park: "Park",
  shop: "Shop",
};

export function placeMeta(p: Place): string {
  return `${TYPE_LABEL[p.type] ?? p.type} · ${p.city}, ${p.region}`;
}
