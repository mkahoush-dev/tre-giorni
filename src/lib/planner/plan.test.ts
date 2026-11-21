import { describe, expect, it } from "vitest";
import { PLACES, PLACE_BY_ID } from "../catalog";
import { DAY_TRIPS, MAX_TRAIN_MINUTES, trainMinutes } from "./constants";
import { alternativesFor, plan, regenerate, removeVisit, replaceVisit, routeOptions, toggleLock } from "./plan";
import { fitsTime, tripDates } from "./rules";
import { scorePlace, weights } from "./score";
import { DEFAULT_PRIORITIES, type Itinerary, type Pace, type Priority, type Route, type TripInput, type Visit } from "./types";

const base: TripInput = {
  startDate: "2027-04-15",
  interests: ["food", "art"],
  priorities: DEFAULT_PRIORITIES,
  pace: "balanced",
  maxPrice: 3,
  mustSee: [],
};

const visits = (it: Itinerary) =>
  it.days.flatMap((d, day) => d.items.filter((i): i is Visit => i.kind === "visit").map((v) => ({ v, day })));

function firstPlan(input: TripInput & { cities?: Parameters<typeof routeOptions>[0]["cities"] }) {
  const { options } = routeOptions(input, PLACES);
  return plan(input, options[0], PLACES);
}

/** Rules every plan must satisfy, whatever the input. */
function expectValid(it: Itinerary, input: TripInput) {
  const dates = tripDates(input.startDate);
  const seenIds = new Set<string>();
  const seenSites = new Set<string>();

  it.days.forEach((day, d) => {
    let clock = 0;
    for (const item of day.items) {
      expect(item.start, `${day.date}: items overlap`).toBeGreaterThanOrEqual(clock);
      expect(item.end).toBeGreaterThanOrEqual(item.start);
      clock = item.end;
      if (item.kind !== "visit") continue;

      const p = PLACE_BY_ID.get(item.placeId)!;
      expect(fitsTime(p, dates[d], item.start), `${p.name} closed at ${item.start} on ${day.date}`).toBe(true);
      expect(seenIds.has(p.id), `${p.name} scheduled twice`).toBe(false);
      seenIds.add(p.id);
      if (p.siteGroup) {
        expect(seenSites.has(p.siteGroup), `${p.name} repeats a same-site place`).toBe(false);
        seenSites.add(p.siteGroup);
      }
      if (!item.mustSee && !item.locked) {
        expect(p.price, `${p.name} over budget`).toBeLessThanOrEqual(input.maxPrice);
        expect(p.excludedReason, `${p.name} is excluded`).toBeNull();
      }
      // Day-trip towns only appear when the user asked for that town.
      if (DAY_TRIPS[p.city]) {
        const askedForTown = input.mustSee.some((id) => PLACE_BY_ID.get(id)?.city === p.city);
        expect(askedForTown, `${p.name} auto-added from a day-trip town`).toBe(true);
      }
    }
  });

  // Every must-see is either scheduled or explained.
  for (const id of input.mustSee) {
    const scheduled = seenIds.has(id);
    const explained = it.conflicts.some((c) => c.placeId === id || c.kind === "too-many-cities");
    expect(scheduled || explained, `${id} silently dropped`).toBe(true);
  }
}

describe("plan invariants across many inputs", () => {
  const starts = ["2027-01-11", "2027-04-12", "2027-04-15", "2027-07-17", "2027-10-16", "2027-12-26"];
  const paces: Pace[] = ["relaxed", "balanced", "packed"];
  const priorityOrders: Priority[][] = [
    DEFAULT_PRIORITIES,
    ["hidden", "budget", "walking", "interests", "rating"],
    ["rating", "interests", "hidden", "walking", "budget"],
  ];
  const mustSeeSets = [[], ["place_032", "place_026"], ["place_043", "place_001"], ["place_064", "place_067"], ["place_038"]];

  for (const startDate of starts)
    for (const pace of paces)
      for (const priorities of priorityOrders)
        for (const mustSee of mustSeeSets) {
          it(`${startDate} ${pace} ${priorities[0]}-first must=[${mustSee}]`, () => {
            const input: TripInput = { ...base, startDate, pace, priorities, mustSee };
            const { options } = routeOptions(input, PLACES);
            for (const route of options) expectValid(plan(input, route, PLACES), input);
          });
        }
});

describe("determinism", () => {
  it("returns an identical plan for identical input", () => {
    const input = { ...base, mustSee: ["place_032"] };
    expect(JSON.stringify(firstPlan(input))).toBe(JSON.stringify(firstPlan(input)));
  });
});

describe("routes", () => {
  it("offers at most 2 cities without must-sees, linked by trains within the limit", () => {
    const { options } = routeOptions(base, PLACES);
    expect(options.length).toBe(3);
    for (const r of options) {
      expect(new Set(r.dayCities).size).toBeLessThanOrEqual(2);
      for (let i = 1; i < 3; i++) expect(trainMinutes(r.dayCities[i - 1], r.dayCities[i])).toBeLessThanOrEqual(MAX_TRAIN_MINUTES);
    }
  });

  it("only offers routes containing every must-see city", () => {
    const { options } = routeOptions({ ...base, mustSee: ["place_067", "place_026"] }, PLACES); // Venice + Florence
    for (const r of options) expect(r.dayCities).toEqual(expect.arrayContaining(["Venice", "Florence"]));
  });

  it("prefers routes where must-sees can actually be scheduled", () => {
    // Monday start: Osteria Francescana (Modena, via Bologna) is closed Mondays.
    const input = { ...base, startDate: "2027-04-12", mustSee: ["place_043"] };
    const it = firstPlan(input);
    expect(visits(it).some((x) => x.v.placeId === "place_043")).toBe(true);
  });

  it("respects the user's own city list", () => {
    const { options } = routeOptions({ ...base, cities: ["Venice"] }, PLACES);
    expect(options.map((o) => o.dayCities)).toEqual([["Venice", "Venice", "Venice"]]);
  });

  it("reports more than 3 must-see cities as a conflict", () => {
    const r = routeOptions({ ...base, mustSee: ["place_001", "place_067", "place_055", "place_047"] }, PLACES);
    expect(r.options).toEqual([]);
    expect(r.conflicts[0].kind).toBe("too-many-cities");
  });
});

describe("conflicts", () => {
  it("explains a must-see closed on every available day", () => {
    // Brera Antique Market: third weekend of the month only; Mon 5 – Wed 7 Apr is not it.
    const it = firstPlan({ ...base, startDate: "2027-04-05", mustSee: ["place_059"] });
    expect(it.conflicts).toContainEqual(expect.objectContaining({ kind: "closed-that-day", placeId: "place_059" }));
  });

  it("explains a day trip that has no full day, instead of calling it closed", () => {
    // Rome, Rome, then Florence: the only Florence day starts with a 95-min train from Rome.
    const input = { ...base, startDate: "2027-05-12", mustSee: ["place_038"] }; // Siena Day Trip
    const route = { dayCities: ["Rome", "Rome", "Florence"] as Route["dayCities"], label: "", score: 0, rushed: false, trainMinutes: 95, highlights: [] };
    const it = plan(input, route, PLACES);
    expect(it.conflicts).toEqual([expect.objectContaining({ kind: "day-trip-needs-full-day", placeId: "place_038" })]);
  });

  it("explains a must-see out of season", () => {
    // Villa del Balbianello opens April-October.
    const it = firstPlan({ ...base, startDate: "2027-01-12", mustSee: ["place_064"] });
    expect(it.conflicts).toContainEqual(expect.objectContaining({ kind: "out-of-season", placeId: "place_064" }));
  });
});

describe("day shape", () => {
  it("gives an ordinary city day both lunch and dinner", () => {
    const it = firstPlan(base);
    const day1 = visits(it).filter((x) => x.day === 0).map((x) => x.v.slot);
    expect(day1).toContain("lunch");
    expect(day1).toContain("dinner");
  });

  it("turns a day-trip must-see into an excursion with trains both ways", () => {
    const it = firstPlan({ ...base, mustSee: ["place_038"] }); // Siena Day Trip
    const day = it.days.find((d) => d.items.some((i) => i.kind === "visit" && i.placeId === "place_038"))!;
    const trains = day.items.filter((i) => i.kind === "travel" && i.mode === "train");
    expect(trains.map((t) => (t.kind === "travel" ? t.to : ""))).toEqual(expect.arrayContaining(["Siena", "Florence"]));
  });

  it("never auto-schedules the excluded low-rated place", () => {
    const it = firstPlan({ ...base, interests: [], maxPrice: 4 });
    expect(visits(it).some((x) => x.v.placeId === "place_025")).toBe(false);
  });
});

describe("scoring", () => {
  it("weights priorities linearly by position", () => {
    expect(weights(["hidden", "rating", "budget", "walking", "interests"])).toEqual({
      hidden: 5, rating: 4, budget: 3, walking: 2, interests: 1,
    });
  });

  it("changes the winner when the priority order changes", () => {
    const colosseum = PLACE_BY_ID.get("place_001")!; // iconic, tourist-heavy, 4.8
    const keyhole = PLACE_BY_ID.get("place_014")!; // hidden gem, 4.6
    const ctx = { interests: [], travelMinutes: null, previousName: null, start: 600, exclude: new Set<string>() };
    const ratingFirst = { ...ctx, priorities: ["rating", "interests", "walking", "budget", "hidden"] as Priority[] };
    const hiddenFirst = { ...ctx, priorities: ["hidden", "interests", "walking", "budget", "rating"] as Priority[] };
    expect(scorePlace(colosseum, ratingFirst).total).toBeGreaterThan(scorePlace(keyhole, ratingFirst).total);
    expect(scorePlace(keyhole, hiddenFirst).total).toBeGreaterThan(scorePlace(colosseum, hiddenFirst).total);
  });
});

describe("editing", () => {
  it("swapping in any offered alternative keeps the plan valid", () => {
    const input = base;
    const it = firstPlan(input);
    const idx = it.days[0].items.findIndex((i) => i.kind === "visit" && i.slot === "activity");
    const alts = alternativesFor(it, input, 0, idx, PLACES);
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) expectValid(replaceVisit(it, 0, idx, alt, PLACES), input);
  });

  it("removing a stop keeps the plan valid", () => {
    const it = firstPlan(base);
    const idx = it.days[1].items.findIndex((i) => i.kind === "visit");
    const after = removeVisit(it, 1, idx, PLACES);
    expectValid(after, base);
    expect(visits(after).length).toBe(visits(it).length - 1);
  });

  it("regenerate keeps locked stops on their day and changes the rest", () => {
    const it = firstPlan(base);
    const idx = it.days[2].items.findIndex((i) => i.kind === "visit");
    const lockedId = (it.days[2].items[idx] as Visit).placeId;
    const next = regenerate(toggleLock(it, 2, idx), base, PLACES);
    expect(visits(next).some((x) => x.day === 2 && x.v.placeId === lockedId && x.v.locked)).toBe(true);
    const before = new Set(visits(it).map((x) => x.v.placeId));
    const changed = visits(next).filter((x) => !before.has(x.v.placeId)).length;
    expect(changed).toBeGreaterThan(3);
    expectValid(next, base);
  });
});
