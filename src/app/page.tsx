import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PLACES, PLACE_BY_ID } from "@/lib/catalog";
import { plan } from "@/lib/planner/plan";
import { DEFAULT_PRIORITIES, type Visit } from "@/lib/planner/types";
import { clock, duration, price } from "@/components/trip/format";
import { VisitLamps } from "@/components/trip/StatusLamp";
import { Wordmark } from "@/components/trip/Wordmark";

const MODES = [
  { mode: "surprise", title: "Surprise me", body: "Give us dates and tastes. We choose the cities and every stop." },
  { mode: "ideas", title: "I have ideas", body: "Pin the places you already want. We plan the rest around them." },
  { mode: "route", title: "I know my route", body: "Pick your cities and must-sees. We fill each day." },
] as const;

// A real planner run, computed at build time: the landing page shows the product, not a mock-up.
const SAMPLE_DATE = "2027-04-15";
const sample = plan(
  { startDate: SAMPLE_DATE, interests: ["food", "art"], priorities: DEFAULT_PRIORITIES, pace: "balanced", maxPrice: 3, mustSee: ["place_001"] },
  { dayCities: ["Rome", "Rome", "Florence"], label: "Rome → Florence", score: 0, rushed: false, trainMinutes: 95, highlights: [] },
  PLACES,
);
const sampleRows = sample.days[0].items.filter((i): i is Visit => i.kind === "visit").slice(0, 5);

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-4 sm:px-8">
          <Wordmark />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:py-20">
        <section>
          <h1 className="text-balance font-board text-5xl font-bold uppercase leading-[0.95] tracking-[0.01em] sm:text-6xl">
            Three days in Italy, planned around what’s <span className="text-signal">actually open</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-paper-dim">
            103 hand-picked places across Rome, Florence, Venice, Milan and Bologna. We check opening hours, seasons and walking
            time, explain every stop, and tell you what we’re not sure about.
          </p>

          <h2 className="board-label mt-12 text-[15px] text-signal">How much do you already know?</h2>
          <ul className="mt-3 overflow-hidden rounded border border-rule">
            {MODES.map((m) => (
              <li key={m.mode} className="border-b border-rule last:border-b-0">
                <Link
                  href={`/plan?mode=${m.mode}`}
                  className="group flex items-center gap-5 bg-night-2 px-5 py-4 no-underline transition-colors hover:bg-night-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-board text-2xl font-bold uppercase tracking-[0.03em] text-paper group-hover:text-signal">
                      {m.title}
                    </span>
                    <span className="block text-[15px] text-paper-dim">{m.body}</span>
                  </span>
                  <ArrowRight className="shrink-0 text-paper-faint transition-transform group-hover:translate-x-1 group-hover:text-signal" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Sample plan" className="rounded border border-rule bg-night-2">
          <div className="flex items-baseline justify-between gap-4 border-b border-rule px-5 py-3">
            <p className="font-semibold">Thursday in Rome</p>
            <p className="text-sm text-paper-faint">Real planner output · food + art · Colosseum pinned</p>
          </div>
          <div className="board-label grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-4 border-b-2 border-signal px-5 py-2 text-[13px] text-signal">
            <span>Time</span>
            <span>Stop</span>
            <span>Status</span>
          </div>
          <ol>
            {sampleRows.map((v) => {
              const p = PLACE_BY_ID.get(v.placeId)!;
              return (
                <li key={v.placeId} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-rule px-5 py-3 last:border-b-0 odd:bg-night-3/60">
                  <span className="font-board text-2xl font-bold text-signal tabular-nums">{clock(v.start)}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block truncate text-sm text-paper-dim">
                      {v.reasons.join(" · ")} · {duration(p.duration.minutes)} · {price(p.price)}
                    </span>
                  </span>
                  <VisitLamps flags={v.flags} max={1} />
                </li>
              );
            })}
          </ol>
          <p className="border-t border-rule px-5 py-3 text-sm text-paper-faint">
            Solid lamps are facts to act on. Dashed lamps mean the data doesn’t confirm it.
          </p>
        </section>
      </main>
    </div>
  );
}
