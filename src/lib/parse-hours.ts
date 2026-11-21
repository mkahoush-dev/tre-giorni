import { DAYS, type Day, type Interval, type WeeklyHours, type Confidence } from "./types";

export interface ParsedHours {
  weekly: WeeklyHours;
  confidence: Exclude<Confidence, "assumed">;
}

const DAY_ALIASES: Record<string, Day> = {
  mon: "mon",
  tue: "tue",
  tues: "tue",
  wed: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  fri: "fri",
  sat: "sat",
  sun: "sun",
};

// Vague phrases seen in the data and the window we interpret them as.
const VAGUE: Record<string, Interval> = {
  evenings: { open: 18 * 60, close: 23 * 60 },
  "morning only": { open: 7 * 60, close: 13 * 60 },
};

export function emptyWeek(): WeeklyHours {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}

export function everyDay(interval: Interval): WeeklyHours {
  const week = emptyWeek();
  for (const d of DAYS) week[d].push({ ...interval });
  return week;
}

/** "9:00" | "19:30" | "8am" | "12:30pm" -> minutes since midnight */
function parseTime(text: string): number | null {
  const m = text.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const suffix = m[3];
  if (suffix === "pm" && h < 12) h += 12;
  if (suffix === "am" && h === 12) h = 0;
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/** "Wed-Mon" wraps around the week: wed, thu, fri, sat, sun, mon */
function dayRange(from: Day, to: Day): Day[] {
  const start = DAYS.indexOf(from);
  const end = DAYS.indexOf(to);
  const out: Day[] = [];
  for (let i = start; ; i = (i + 1) % 7) {
    out.push(DAYS[i]);
    if (i === end) break;
  }
  return out;
}

const TOKEN = /([A-Za-z]+)\s*-\s*([A-Za-z]+)|(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|([A-Za-z]+)/gi;

/**
 * Parse an opening-hours string into a weekly schedule.
 * Returns null when the string is empty or cannot be understood, so the caller
 * can fall back to an assumed default and record that in the report.
 *
 * Grammar (left to right): day specs accumulate until a time range appears;
 * the range applies to the accumulated days (or every day if none); a day spec
 * after a time range starts a new group. This handles:
 *   "Mon-Sat 12:30-14:30, 19:30-22:30"   (split shift, days carry over)
 *   "Mon-Fri 7:00-14:00, Sat 7:00-17:00" (new day group)
 *   "Tues, Thurs-Sun 10:00-18:00"        (comma-separated day list)
 *   "8:00-01:00"                          (closes after midnight)
 */
export function parseHours(raw: string | null): ParsedHours | null {
  if (!raw || !raw.trim()) return null;
  const text = raw.trim();

  const vague = VAGUE[text.toLowerCase()];
  if (vague) return { weekly: everyDay(vague), confidence: "inferred" };

  const week = emptyWeek();
  let days: Day[] = [];
  let lastWasTime = false;
  let matchedAnyTime = false;

  for (const m of text.matchAll(TOKEN)) {
    const [, rangeFrom, rangeTo, timeOpen, timeClose, word] = m;

    if (timeOpen && timeClose) {
      const open = parseTime(timeOpen);
      let close = parseTime(timeClose);
      if (open === null || close === null) return null;
      if (close <= open) close += 24 * 60; // e.g. 8:00-01:00
      const target = days.length ? days : [...DAYS];
      for (const d of target) week[d].push({ open, close });
      lastWasTime = true;
      matchedAnyTime = true;
      continue;
    }

    // A day token after a time range starts a new day group.
    if (lastWasTime) {
      days = [];
      lastWasTime = false;
    }

    if (rangeFrom && rangeTo) {
      const a = DAY_ALIASES[rangeFrom.toLowerCase()];
      const b = DAY_ALIASES[rangeTo.toLowerCase()];
      if (!a || !b) return null;
      days.push(...dayRange(a, b));
      continue;
    }

    if (word) {
      const w = word.toLowerCase();
      if (w === "daily") continue; // explicit "every day" = no day filter
      const d = DAY_ALIASES[w];
      if (!d) return null;
      days.push(d);
    }
  }

  return matchedAnyTime ? { weekly: week, confidence: "listed" } : null;
}

/** Is the place open for the whole visit [start, start + minutes) on this day? */
export function isOpenFor(weekly: WeeklyHours, day: Day, start: number, minutes: number): boolean {
  return weekly[day].some((iv) => start >= iv.open && start + minutes <= iv.close);
}
