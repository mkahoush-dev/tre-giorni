import { DETOUR_FACTOR, MAX_WALK_KM, TRANSIT_KMH, TRANSIT_OVERHEAD_MIN, WALK_KMH } from "./constants";

export interface Point {
  lat: number;
  lng: number;
}

export function distanceKm(a: Point, b: Point): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Estimated travel between two points in a city: straight line x detour factor,
 * walked if short, otherwise a bus/taxi estimate.
 */
export function cityTravel(a: Point, b: Point): { mode: "walk" | "transit"; minutes: number } {
  const km = distanceKm(a, b) * DETOUR_FACTOR;
  if (km <= MAX_WALK_KM) return { mode: "walk", minutes: Math.max(1, Math.round((km / WALK_KMH) * 60)) };
  return { mode: "transit", minutes: Math.round(TRANSIT_OVERHEAD_MIN + (km / TRANSIT_KMH) * 60) };
}
