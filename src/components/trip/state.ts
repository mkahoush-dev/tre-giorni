import type { Wishes } from "@/lib/ai/schema";
import { PLACES } from "@/lib/catalog";
import {
  regenerate,
  removeVisit,
  replaceVisit,
  routeOptions,
  plan,
  toggleLock,
  type Alternative,
} from "@/lib/planner/plan";
import {
  DEFAULT_PRIORITIES,
  type Conflict,
  type Hub,
  type Itinerary,
  type Route,
  type TripInput,
  type Visit,
} from "@/lib/planner/types";

/** How much the user already knows when they arrive. */
export type Mode = "surprise" | "ideas" | "route";
export type Step = "setup" | "routes" | "board";

export type SetupInput = TripInput & { cities: Hub[] };

export interface TripState {
  mode: Mode;
  step: Step;
  input: SetupInput;
  routes: Route[];
  routeConflicts: Conflict[];
  itinerary: Itinerary | null;
  activeDay: number;
  /** Place ids changed by the last edit; highlighted until the user notices them. */
  changed: string[];
}

export type Action =
  | { type: "set-input"; input: Partial<SetupInput> }
  | { type: "find-routes" }
  | { type: "choose-route"; index: number }
  | { type: "back-to"; step: Step }
  | { type: "set-day"; day: number }
  | { type: "swap"; day: number; item: number; alt: Alternative }
  | { type: "remove"; day: number; item: number }
  | { type: "toggle-lock"; day: number; item: number }
  | { type: "regenerate" }
  | { type: "seen"; placeId: string }
  | { type: "apply-wishes"; wishes: Wishes };

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return d.toISOString().slice(0, 10);
}

export function initialState(mode: Mode): TripState {
  return {
    mode,
    step: "setup",
    input: {
      startDate: defaultStartDate(),
      interests: [],
      priorities: DEFAULT_PRIORITIES,
      pace: "balanced",
      maxPrice: 3,
      mustSee: [],
      cities: [],
    },
    routes: [],
    routeConflicts: [],
    itinerary: null,
    activeDay: 0,
    changed: [],
  };
}

const visitIds = (it: Itinerary | null) =>
  new Set(it?.days.flatMap((d) => d.items.filter((i): i is Visit => i.kind === "visit").map((v) => v.placeId)) ?? []);

/** Ids present in `next` that were not in `prev`. */
function newIds(prev: Itinerary | null, next: Itinerary): string[] {
  const before = visitIds(prev);
  return [...visitIds(next)].filter((id) => !before.has(id));
}

/** The planner input as the planner sees it: "I know my route" is the only mode that pins cities. */
function plannerInput(state: TripState): SetupInput {
  return state.mode === "route" ? state.input : { ...state.input, cities: [] };
}

export function reducer(state: TripState, action: Action): TripState {
  switch (action.type) {
    case "set-input":
      return { ...state, input: { ...state.input, ...action.input } };

    case "find-routes": {
      const { options, conflicts } = routeOptions(plannerInput(state), PLACES);
      return { ...state, step: "routes", routes: options, routeConflicts: conflicts };
    }

    case "choose-route": {
      const route = state.routes[action.index];
      if (!route) return state;
      const itinerary = plan(plannerInput(state), route, PLACES);
      return { ...state, step: "board", itinerary, activeDay: 0, changed: [] };
    }

    case "back-to":
      return { ...state, step: action.step };

    case "set-day":
      return { ...state, activeDay: action.day };

    case "swap": {
      if (!state.itinerary) return state;
      const next = replaceVisit(state.itinerary, action.day, action.item, action.alt, PLACES);
      return { ...state, itinerary: next, changed: [action.alt.place.id] };
    }

    case "remove": {
      if (!state.itinerary) return state;
      return { ...state, itinerary: removeVisit(state.itinerary, action.day, action.item, PLACES), changed: [] };
    }

    case "toggle-lock": {
      if (!state.itinerary) return state;
      return { ...state, itinerary: toggleLock(state.itinerary, action.day, action.item) };
    }

    case "regenerate": {
      if (!state.itinerary) return state;
      const next = regenerate(state.itinerary, plannerInput(state), PLACES);
      return { ...state, itinerary: next, changed: newIds(state.itinerary, next) };
    }

    case "apply-wishes": {
      // Only fields the model filled in overwrite the form; must-sees are added, not replaced.
      const w = action.wishes;
      const input = { ...state.input };
      if (w.interests.length) input.interests = w.interests;
      input.priorities = w.priorities;
      if (w.pace) input.pace = w.pace;
      if (w.maxPrice) input.maxPrice = w.maxPrice;
      if (w.mustSee.length) input.mustSee = [...new Set([...input.mustSee, ...w.mustSee])];
      if (w.cities.length && state.mode === "route") input.cities = w.cities;
      return { ...state, input };
    }

    case "seen":
      return state.changed.includes(action.placeId)
        ? { ...state, changed: state.changed.filter((id) => id !== action.placeId) }
        : state;
  }
}

// ---- persistence: this tab only (sessionStorage), never shared ----

const KEY = "tre-giorni:trip:v1";

export function loadState(mode: Mode): TripState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as TripState;
      if (saved.mode === mode) return saved;
    }
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  return initialState(mode);
}

export function saveState(state: TripState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the plan still works, it just won't survive a refresh.
  }
}

export function clearState() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
