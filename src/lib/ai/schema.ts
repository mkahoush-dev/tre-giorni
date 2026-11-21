import { z } from "zod";
import { PLACES, PLACE_BY_ID } from "../catalog";
import { HUBS } from "../planner/constants";
import { DEFAULT_PRIORITIES, PRIORITIES, type Hub, type Interest, type Pace, type Priority } from "../planner/types";

const INTERESTS = ["food", "art", "history", "views", "wine", "outdoors", "evenings", "shopping"] as const satisfies readonly Interest[];
const PRICE_LEVELS = ["€", "€€", "€€€", "€€€€"] as const;

/**
 * What the LLM must return. Every field is required (nullable where "no signal"),
 * because strict structured-output modes require all properties to be listed.
 * Free text is never trusted: `validateWishes` re-checks everything below.
 */
export const WishesSchema = z.object({
  interests: z.array(z.enum(INTERESTS)).describe("Interests clearly expressed or implied. Empty if none."),
  priorities: z
    .array(z.enum(PRIORITIES as [Priority, ...Priority[]]))
    .describe("Priorities the user emphasised, most important first. Empty if no signal. Never guess."),
  pace: z.enum(["relaxed", "balanced", "packed"]).nullable().describe("null if not mentioned"),
  maxPrice: z.enum(PRICE_LEVELS).nullable().describe("Highest price level acceptable; null if not mentioned"),
  mustSee: z.array(z.string()).describe("Catalog ids (e.g. place_032) of places the user explicitly wants. Only ids from the catalog."),
  cities: z.array(z.enum(HUBS as [Hub, ...Hub[]])).describe("Base cities the user explicitly named, in travel order. Empty if none."),
  summary: z.string().describe("One short sentence describing what you understood, in plain English."),
});

export type RawWishes = z.infer<typeof WishesSchema>;

/** The checked result the app actually applies. */
export interface Wishes {
  interests: Interest[];
  priorities: Priority[];
  pace: Pace | null;
  maxPrice: number | null;
  mustSee: string[];
  cities: Hub[];
  summary: string;
}

export interface ValidationResult {
  wishes: Wishes;
  /** Ids the model returned that are not in the dataset (dropped, shown to the user). */
  droppedIds: string[];
}

/**
 * Trust boundary: model output -> app state.
 * Parses with the schema, then enforces what a schema can't: ids must exist,
 * no duplicates, priority list completed to all five in a sensible order.
 * Throws if the shape is wrong; the caller shows a friendly error.
 */
export function validateWishes(raw: unknown): ValidationResult {
  const parsed = WishesSchema.parse(raw);
  const uniq = <T>(xs: T[]) => [...new Set(xs)];

  const ids = uniq(parsed.mustSee.map((s) => s.trim()));
  const known = ids.filter((id) => PLACE_BY_ID.has(id));
  const droppedIds = ids.filter((id) => !PLACE_BY_ID.has(id));

  // Emphasised priorities first, the rest in default order.
  const stated = uniq(parsed.priorities);
  const priorities = [...stated, ...DEFAULT_PRIORITIES.filter((p) => !stated.includes(p))];

  return {
    wishes: {
      interests: uniq(parsed.interests),
      priorities,
      pace: parsed.pace,
      maxPrice: parsed.maxPrice ? parsed.maxPrice.length : null,
      mustSee: known,
      cities: uniq(parsed.cities).slice(0, 3),
      summary: parsed.summary.slice(0, 300),
    },
    droppedIds,
  };
}

/** One compact line per place: enough for the model to match names, nothing it could invent from. */
export const CATALOG_TEXT = PLACES.filter((p) => !p.excludedReason)
  .map((p) => `${p.id} | ${p.name} | ${p.city} | ${p.type} | ${p.tags.join(", ")}`)
  .join("\n");

export const SYSTEM_PROMPT = `You turn a traveller's free-text description of a 3-day trip in Italy into structured preferences for a trip planner.

The planner, not you, builds the itinerary. Your only job is to fill in the preference fields from what the traveller actually said.

Rules:
- Use only place ids from the catalog below. If the traveller mentions a place that is not in the catalog, leave it out and mention it in the summary.
- Match places by meaning, not just exact name (for example "the David" is the Accademia Gallery).
- Leave a field empty or null when the traveller gave no signal for it. Do not guess defaults.
- priorities: order only the ones the traveller emphasised ("on a budget" -> budget, "hate crowds" -> hidden, "best of the best" -> rating, "don't want to walk much" -> walking, interests -> interests).
- cities: only cities the traveller named as places to stay or visit, from Rome, Florence, Milan, Venice, Bologna. A day-trip town (Siena, Lake Como, Modena...) is a must-see place, not a city.

Catalog (id | name | city | type | tags):
${CATALOG_TEXT}`;
