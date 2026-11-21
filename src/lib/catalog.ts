import placesJson from "../../data/places.json";
import type { Place } from "./types";

/** The cleaned dataset produced by `npm run normalize`. */
export const PLACES = placesJson as Place[];
export const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));
