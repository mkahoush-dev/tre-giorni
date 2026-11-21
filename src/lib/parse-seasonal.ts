import type { Seasonal } from "./types";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const MONTH = `(${MONTHS.join("|")})`;

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.toLowerCase()) + 1;
}

function monthSpan(from: string, to: string): number[] {
  const a = monthIndex(from);
  const b = monthIndex(to);
  const out: number[] = [];
  for (let m = a; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === b) break;
  }
  return out;
}

/**
 * Extract machine-usable rules from a free-text seasonal note.
 * Each rule is a narrow, explicit pattern; anything unmatched is still kept in
 * `note` and shown to the user, so nothing is silently lost.
 */
export function parseSeasonal(note: string | null): Seasonal {
  const out: Seasonal = {
    openMonths: null,
    bestMonths: null,
    thirdWeekendOnly: false,
    bookingMonths: null,
    note,
  };
  if (!note) return out;
  const n = note.toLowerCase();

  // "Open April-October only" / "Rooftop open May-September only" are different:
  // the rooftop is a part of the venue, so treat it as a soft preference.
  const openOnly = n.match(new RegExp(`(rooftop )?open ${MONTH}-${MONTH} only`));
  if (openOnly) {
    const span = monthSpan(openOnly[2], openOnly[3]);
    if (openOnly[1]) out.bestMonths = span;
    else out.openMonths = span;
  }

  // "October only — check exact festival dates"
  const singleMonth = n.match(new RegExp(`^${MONTH} only`));
  if (singleMonth) out.openMonths = [monthIndex(singleMonth[1])];

  // "Best April-October" / "Best May-September when ..."
  const best = n.match(new RegExp(`best ${MONTH}-${MONTH}`));
  if (best) out.bestMonths = monthSpan(best[1], best[2]);

  // "Booking essential April-October"
  const booking = n.match(new RegExp(`booking essential ${MONTH}-${MONTH}`));
  if (booking) out.bookingMonths = monthSpan(booking[1], booking[2]);

  if (/third weekend of each month only/.test(n)) out.thirdWeekendOnly = true;

  return out;
}
