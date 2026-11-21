"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { Mode } from "@/components/trip/state";

// Client-only: the planner reads sessionStorage and Leaflet needs `window`.
const TripApp = dynamic(() => import("@/components/trip/TripApp"), {
  ssr: false,
  loading: () => <p className="board-label p-8 text-paper-faint">Loading planner…</p>,
});

const MODES: Mode[] = ["surprise", "ideas", "route"];

export function TripLoader() {
  // Read the mode reactively. Next keeps /plan mounted when you navigate away and back,
  // so reading the URL once would leave the previous mode on screen. Keying by mode
  // gives each mode a fresh TripApp whenever ?mode= changes.
  const raw = useSearchParams().get("mode");
  const mode: Mode = MODES.includes(raw as Mode) ? (raw as Mode) : "surprise";
  return <TripApp key={mode} mode={mode} />;
}
