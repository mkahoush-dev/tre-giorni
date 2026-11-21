import { describe, expect, it } from "vitest";
import { parseSeasonal } from "./parse-seasonal";

describe("parseSeasonal", () => {
  it("returns an empty rule set for no note", () => {
    expect(parseSeasonal(null)).toMatchObject({ openMonths: null, bestMonths: null, thirdWeekendOnly: false });
  });

  it("treats 'Open X-Y only' as a hard closure", () => {
    const s = parseSeasonal("Open April-October only. Summer weekends extremely crowded.");
    expect(s.openMonths).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(s.bestMonths).toBeNull();
  });

  it("treats a rooftop-only closure as a soft preference", () => {
    const s = parseSeasonal("Rooftop open May-September only.");
    expect(s.openMonths).toBeNull();
    expect(s.bestMonths).toEqual([5, 6, 7, 8, 9]);
  });

  it("parses a single-month event", () => {
    expect(parseSeasonal("October only — check exact festival dates before planning.").openMonths).toEqual([10]);
  });

  it("combines hard and soft rules in one note", () => {
    const s = parseSeasonal("Open April-October only. Best in September during harvest season.");
    expect(s.openMonths).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it("parses 'Best X-Y' as soft", () => {
    expect(parseSeasonal("Best May-September when canal-side seating is open.").bestMonths).toEqual([5, 6, 7, 8, 9]);
  });

  it("parses seasonal booking rules", () => {
    expect(parseSeasonal("Booking essential April-October.").bookingMonths).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it("flags third-weekend-only markets", () => {
    expect(parseSeasonal("Third weekend of each month only.").thirdWeekendOnly).toBe(true);
  });

  it("keeps unparsed notes verbatim", () => {
    const note = "Summer queues can be brutal — pre-book online always.";
    expect(parseSeasonal(note)).toMatchObject({ note, openMonths: null, bestMonths: null });
  });
});
