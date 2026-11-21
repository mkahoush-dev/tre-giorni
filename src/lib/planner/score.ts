import type { Place } from "../types";
import {
  ASSUMED_HOURS_PENALTY,
  EXCLUDED_PENALTY,
  INTEREST_LABELS,
  INTEREST_TAGS,
  MIN_RATING_SIGNAL,
  TIME_OF_DAY_BONUS,
} from "./constants";
import type { Interest, Priority } from "./types";

export interface ScoreContext {
  interests: Interest[];
  priorities: Priority[];
  /** Minutes of travel from the previous stop, or null for the first stop of a day. */
  travelMinutes: number | null;
  previousName: string | null;
  /** Start time of the slot, minutes since midnight. */
  start: number;
  /** Place ids shown in the previous plan (down-ranked on Regenerate). */
  exclude: Set<string>;
}

export interface Score {
  total: number;
  /** Weighted contribution per priority, used to explain the pick. */
  parts: Record<Priority, number>;
  reasons: string[];
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));

export function matchedInterests(place: Place, interests: Interest[]): Interest[] {
  return interests.filter((i) => INTEREST_TAGS[i].some((t) => place.tags.includes(t)));
}

/** Each signal scaled to 0..1, higher is better. */
export function signals(place: Place, ctx: ScoreContext): Record<Priority, number> {
  const matched = matchedInterests(place, ctx.interests).length;
  const hiddenTags = ["hidden-gem", "local-favorite", "quiet"].some((t) => place.tags.includes(t));
  return {
    interests: ctx.interests.length ? Math.min(matched, 2) / 2 : 0.5,
    rating: clamp((place.rating - MIN_RATING_SIGNAL) / (5 - MIN_RATING_SIGNAL)),
    hidden: clamp(0.5 + (hiddenTags ? 0.5 : 0) - (place.tags.includes("tourist-heavy") ? 0.5 : 0)),
    budget: (4 - place.price) / 3,
    walking: ctx.travelMinutes === null ? 0.5 : 1 - Math.min(ctx.travelMinutes, 40) / 40,
  };
}

/** Linear rank weights: first priority 5, last 1. */
export function weights(priorities: Priority[]): Record<Priority, number> {
  const n = priorities.length;
  return Object.fromEntries(priorities.map((p, i) => [p, n - i])) as Record<Priority, number>;
}

export function scorePlace(place: Place, ctx: ScoreContext): Score {
  const s = signals(place, ctx);
  const w = weights(ctx.priorities);
  const weightSum = ctx.priorities.reduce((sum, p) => sum + w[p], 0);

  const parts = {} as Record<Priority, number>;
  let total = 0;
  for (const p of ctx.priorities) {
    parts[p] = w[p] * s[p];
    total += parts[p];
  }
  total /= weightSum;

  const morning = ctx.start < 12 * 60 && place.tags.includes("morning");
  const evening = ctx.start >= 18 * 60 && place.tags.includes("evening");
  if (morning || evening) total += TIME_OF_DAY_BONUS;
  if (place.hours.confidence === "assumed") total *= ASSUMED_HOURS_PENALTY;
  if (ctx.exclude.has(place.id)) total *= EXCLUDED_PENALTY;

  const reasons = explain(place, ctx, parts, s);
  return { total, parts, reasons: reasons.length ? reasons : [`Rated ${place.rating}`] };
}

function explain(place: Place, ctx: ScoreContext, parts: Record<Priority, number>, s: Record<Priority, number>): string[] {
  const top = (Object.keys(parts) as Priority[])
    .filter((p) => s[p] > 0.5)
    .sort((a, b) => parts[b] - parts[a])
    .slice(0, 2);

  return top.flatMap((p) => {
    switch (p) {
      case "interests":
        return [matchedInterests(place, ctx.interests).map((i) => INTEREST_LABELS[i]).slice(0, 2).join(" + ")];
      case "rating":
        return place.rating >= 4.5 ? [`Rated ${place.rating}`] : [];
      case "hidden":
        return [place.tags.includes("hidden-gem") ? "Hidden gem" : "Locals' favourite"];
      case "budget":
        return place.price === 1 ? ["€ budget-friendly"] : [];
      case "walking":
        return ctx.previousName ? [`${ctx.travelMinutes} min from ${ctx.previousName}`] : [];
    }
  });
}
