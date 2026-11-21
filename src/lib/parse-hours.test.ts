import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isOpenFor, parseHours } from "./parse-hours";
import type { RawPlace } from "./types";

const h = (hh: number, mm = 0) => hh * 60 + mm;

describe("parseHours", () => {
  it("returns null for missing hours", () => {
    expect(parseHours(null)).toBeNull();
    expect(parseHours("  ")).toBeNull();
  });

  it("applies a plain range to every day", () => {
    const r = parseHours("9:00-19:00")!;
    expect(r.confidence).toBe("listed");
    expect(r.weekly.mon).toEqual([{ open: h(9), close: h(19) }]);
    expect(r.weekly.sun).toEqual([{ open: h(9), close: h(19) }]);
  });

  it("respects day ranges", () => {
    const r = parseHours("Tues-Sun 8:15-18:50")!;
    expect(r.weekly.mon).toEqual([]);
    expect(r.weekly.tue).toEqual([{ open: h(8, 15), close: h(18, 50) }]);
  });

  it("wraps day ranges around the week", () => {
    const r = parseHours("Wed-Mon 10:00-19:00")!;
    expect(r.weekly.tue).toEqual([]);
    expect(r.weekly.mon).toHaveLength(1);
    expect(r.weekly.sun).toHaveLength(1);
  });

  it("carries days over to a split shift", () => {
    const r = parseHours("Mon-Sat 12:30-14:30, 19:30-22:30")!;
    expect(r.weekly.sat).toEqual([
      { open: h(12, 30), close: h(14, 30) },
      { open: h(19, 30), close: h(22, 30) },
    ]);
    expect(r.weekly.sun).toEqual([]);
  });

  it("starts a new day group after a time range", () => {
    const r = parseHours("Mon-Fri 7:00-14:00, Sat 7:00-17:00")!;
    expect(r.weekly.fri).toEqual([{ open: h(7), close: h(14) }]);
    expect(r.weekly.sat).toEqual([{ open: h(7), close: h(17) }]);
    expect(r.weekly.sun).toEqual([]);
  });

  it("handles a comma-separated day list", () => {
    const r = parseHours("Tues, Thurs-Sun 10:00-18:00")!;
    expect(r.weekly.tue).toHaveLength(1);
    expect(r.weekly.wed).toEqual([]);
    expect(r.weekly.thu).toHaveLength(1);
    expect(r.weekly.sun).toHaveLength(1);
  });

  it("handles a different Sunday schedule", () => {
    const r = parseHours("Mon-Sat 9:30-17:30, Sun 14:00-17:30")!;
    expect(r.weekly.sun).toEqual([{ open: h(14), close: h(17, 30) }]);
    expect(r.weekly.mon).toEqual([{ open: h(9, 30), close: h(17, 30) }]);
  });

  it("parses am/pm times", () => {
    expect(parseHours("8am-7pm")!.weekly.wed).toEqual([{ open: h(8), close: h(19) }]);
    expect(parseHours("9am-12:30pm")!.weekly.wed).toEqual([{ open: h(9), close: h(12, 30) }]);
  });

  it("handles closing at or after midnight", () => {
    expect(parseHours("7:30-24:00")!.weekly.mon).toEqual([{ open: h(7, 30), close: h(24) }]);
    expect(parseHours("8:00-01:00")!.weekly.mon).toEqual([{ open: h(8), close: h(25) }]);
  });

  it("treats 'Daily' as every day", () => {
    expect(parseHours("Daily 10:00-24:00")!.weekly.tue).toHaveLength(1);
  });

  it("interprets vague phrases with lower confidence", () => {
    const e = parseHours("Evenings")!;
    expect(e.confidence).toBe("inferred");
    expect(e.weekly.fri).toEqual([{ open: h(18), close: h(23) }]);
    expect(parseHours("Morning only")!.weekly.fri).toEqual([{ open: h(7), close: h(13) }]);
  });

  it("returns null for text it does not understand", () => {
    expect(parseHours("Ask at the door")).toBeNull();
    expect(parseHours("Mon-Funday 9:00-10:00")).toBeNull();
  });

  it("parses every non-null hours string in the dataset", () => {
    const raw: RawPlace[] = JSON.parse(readFileSync("data/raw/italy.json", "utf8"));
    const distinct = [...new Set(raw.map((p) => p.hours).filter((x): x is string => !!x))];
    const failures = distinct.filter((s) => parseHours(s) === null);
    expect(failures).toEqual([]);
    expect(distinct.length).toBe(57); // fails loudly if the dataset changes
  });
});

describe("isOpenFor", () => {
  const lunch = parseHours("Mon-Sat 12:30-14:30, 19:30-22:30")!.weekly;

  it("requires the whole visit to fit inside one opening", () => {
    expect(isOpenFor(lunch, "mon", h(12, 30), 90)).toBe(true);
    expect(isOpenFor(lunch, "mon", h(13, 30), 90)).toBe(false); // runs past 14:30
    expect(isOpenFor(lunch, "sun", h(12, 30), 60)).toBe(false); // closed Sunday
  });
});
