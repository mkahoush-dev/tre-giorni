"use client";

import { ArrowLeft, ArrowRight, TrainFront } from "lucide-react";
import type { Dispatch } from "react";
import { trainMinutes } from "@/lib/planner/constants";
import { tripDates } from "@/lib/planner/rules";
import { Button } from "../ui/controls";
import { WEEKDAY, duration, shortDate } from "./format";
import { StatusLamp } from "./StatusLamp";
import type { Action, TripState } from "./state";

export function RouteOptions({ state, dispatch }: { state: TripState; dispatch: Dispatch<Action> }) {
  const dates = tripDates(state.input.startDate);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8">
      <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "back-to", step: "setup" })} className="-ml-3">
        <ArrowLeft size={16} aria-hidden /> Change preferences
      </Button>
      <h1 className="mt-4 font-board text-4xl font-bold uppercase tracking-[0.02em] sm:text-5xl">Choose a route</h1>
      <p className="mt-2 max-w-xl text-lg text-paper-dim">
        Ranked by how well the places each route reaches fit your priorities on these dates, minus time spent on trains.
      </p>

      {state.routeConflicts.map((c) => (
        <div key={c.message} role="alert" className="mt-6 flex items-start gap-3 rounded border border-stop bg-stop-soft p-4">
          <StatusLamp kind="train">Conflict</StatusLamp>
          <p>{c.message}</p>
        </div>
      ))}

      {!state.routes.length && !state.routeConflicts.length && (
        <p className="mt-8 text-paper-dim">No route fits these choices. Try different cities or fewer must-sees.</p>
      )}

      <ol className="mt-8 grid gap-3">
        {state.routes.map((r, i) => (
          <li key={r.dayCities.join()}>
            <button
              type="button"
              onClick={() => dispatch({ type: "choose-route", index: i })}
              className="group grid w-full gap-4 rounded border border-rule bg-night-2 p-5 text-left transition-colors hover:border-signal hover:bg-night-3 sm:grid-cols-[3rem_1fr_auto] sm:items-center"
            >
              <span className="board-label text-3xl text-signal">{i + 1}</span>
              <span>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-semibold">{r.label}</span>
                  {i === 0 && <span className="board-label text-[13px] text-signal">Best fit</span>}
                  {r.rushed && <StatusLamp kind="unsure">Rushed</StatusLamp>}
                </span>
                <span className="mt-3 grid gap-x-6 gap-y-1 text-[15px] text-paper-dim sm:grid-cols-3">
                  {r.dayCities.map((city, d) => {
                    const from = d > 0 && r.dayCities[d - 1] !== city ? r.dayCities[d - 1] : null;
                    return (
                      <span key={d} className="flex items-center gap-2">
                        <span className="board-label w-24 shrink-0 whitespace-nowrap text-paper-faint">
                          {WEEKDAY[dates[d].weekday]} {shortDate(dates[d].iso)}
                        </span>
                        <span className="text-paper">{city}</span>
                        {from && (
                          <span className="inline-flex items-center gap-1 text-sm">
                            <TrainFront size={14} aria-hidden /> {duration(trainMinutes(from, city))}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </span>
                <span className="mt-3 block text-[15px] text-paper-dim">
                  <span className="text-paper">{r.trainMinutes ? `${duration(r.trainMinutes)} on trains` : "No trains"}</span>
                  {r.highlights.length > 0 && <> · Highlights: {r.highlights.join(", ")}</>}
                </span>
              </span>
              <span className="board-label inline-flex items-center gap-1.5 text-sm text-paper-dim group-hover:text-signal">
                Build this plan <ArrowRight size={16} aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
