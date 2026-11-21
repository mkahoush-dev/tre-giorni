import type { Metadata } from "next";
import { Suspense } from "react";
import { TripLoader } from "./TripLoader";

export const metadata: Metadata = { title: "Plan your 3 days · Tre Giorni" };

export default function PlanPage() {
  // TripLoader reads ?mode= with useSearchParams, which a static page must wrap in Suspense.
  return (
    <Suspense fallback={<p className="board-label p-8 text-paper-faint">Loading planner…</p>}>
      <TripLoader />
    </Suspense>
  );
}
