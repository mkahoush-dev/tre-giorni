"use client";

import { ArrowRight } from "lucide-react";
import type { Dispatch } from "react";
import { HUBS, INTEREST_LABELS } from "@/lib/planner/constants";
import { tripDates } from "@/lib/planner/rules";
import type { Hub, Interest } from "@/lib/planner/types";
import { Button, Chip, FieldLabel, Segmented } from "../ui/controls";
import { WEEKDAY, shortDate } from "./format";
import { AiBox } from "./AiBox";
import { MustSeePicker } from "./MustSeePicker";
import { PriorityList } from "./PriorityList";
import type { Action, Mode, TripState } from "./state";

const MODE_COPY: Record<Mode, { title: string; lead: string }> = {
  surprise: { title: "Surprise me", lead: "Dates and tastes. We choose the cities and every stop." },
  ideas: { title: "I have ideas", lead: "Pin the places you already want. We plan the rest around them." },
  route: { title: "I know my route", lead: "Choose your cities and must-sees. We fill each day." },
};

export function Setup({ state, dispatch }: { state: TripState; dispatch: Dispatch<Action> }) {
  const { input, mode } = state;
  const set = (patch: Partial<TripState["input"]>) => dispatch({ type: "set-input", input: patch });
  const dates = tripDates(input.startDate);
  const toggleInterest = (i: Interest) =>
    set({ interests: input.interests.includes(i) ? input.interests.filter((x) => x !== i) : [...input.interests, i] });
  const toggleCity = (c: Hub) =>
    set({ cities: input.cities.includes(c) ? input.cities.filter((x) => x !== c) : [...input.cities, c].slice(0, 3) });
  const today = new Date().toISOString().slice(0, 10);
  const blocked = mode === "route" && input.cities.length === 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-32 pt-8 sm:px-8">
      <h1 className="font-board text-4xl font-bold uppercase tracking-[0.02em] sm:text-5xl">{MODE_COPY[mode].title}</h1>
      <p className="mt-2 max-w-xl text-lg text-paper-dim">{MODE_COPY[mode].lead}</p>

      {/* minmax(0,1fr): grid tracks may shrink below their content's min width (no sideways overflow on phones). */}
      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10">
        <section className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="start-date" hint={`${WEEKDAY[dates[0].weekday]} ${shortDate(dates[0].iso)} – ${WEEKDAY[dates[2].weekday]} ${shortDate(dates[2].iso)}`}>
              First day
            </FieldLabel>
            <input
              id="start-date"
              type="date"
              min={today}
              value={input.startDate}
              onChange={(e) => e.target.value && set({ startDate: e.target.value })}
              className="h-12 w-full rounded border border-rule bg-night-2 px-3 text-[15px] tabular-nums"
            />
            <p className="mt-2 text-sm text-paper-faint">Dates matter: many museums close Mondays and some places only open April–October.</p>
          </div>
          <div>
            <FieldLabel>Budget</FieldLabel>
            <Segmented
              label="Budget"
              value={input.maxPrice}
              onChange={(maxPrice) => set({ maxPrice })}
              options={[
                { value: 1, label: "€", hint: "Cheap eats" },
                { value: 2, label: "€€", hint: "Moderate" },
                { value: 3, label: "€€€", hint: "Some treats" },
                { value: 4, label: "€€€€", hint: "No limit" },
              ]}
            />
          </div>
        </section>

        {mode === "route" && (
          <section>
            <FieldLabel hint="Up to 3, in travel order">Cities</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {HUBS.map((c) => (
                <Chip key={c} on={input.cities.includes(c)} onClick={() => toggleCity(c)}>
                  {input.cities.includes(c) && <span className="mr-1.5 font-bold">{input.cities.indexOf(c) + 1}</span>}
                  {c}
                </Chip>
              ))}
            </div>
            {input.cities.length === 3 && <p className="mt-2 text-sm text-paper-faint">Three cities in three days means a train every day. It works, but it&rsquo;s rushed.</p>}
          </section>
        )}

        <section>
          <FieldLabel hint={input.interests.length ? `${input.interests.length} picked` : "Pick any"}>Interests</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(INTEREST_LABELS) as Interest[]).map((i) => (
              <Chip key={i} on={input.interests.includes(i)} onClick={() => toggleInterest(i)}>
                {INTEREST_LABELS[i]}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <FieldLabel>Pace</FieldLabel>
          <Segmented
            label="Pace"
            value={input.pace}
            onChange={(pace) => set({ pace })}
            options={[
              { value: "relaxed", label: "Relaxed", hint: "3 stops + 2 meals a day" },
              { value: "balanced", label: "Balanced", hint: "4 stops + 2 meals" },
              { value: "packed", label: "Packed", hint: "5–6 stops, late evenings" },
            ]}
          />
        </section>

        <section>
          <FieldLabel hint="Drag or use the arrows. Leave as is to skip.">What matters most</FieldLabel>
          <PriorityList value={input.priorities} onChange={(priorities) => set({ priorities })} />
        </section>

        {(mode !== "surprise" || input.mustSee.length > 0) && (
          <section>
            <FieldLabel hint="Optional">Must-see places</FieldLabel>
            <MustSeePicker value={input.mustSee} startDate={input.startDate} onChange={(mustSee) => set({ mustSee })} />
          </section>
        )}

        <AiBox dispatch={dispatch} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-night/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <p className="hidden text-sm text-paper-dim sm:block">
            {blocked ? "Pick at least one city." : "Three route options next. Nothing is booked."}
          </p>
          <Button variant="primary" size="lg" disabled={blocked} onClick={() => dispatch({ type: "find-routes" })} className="w-full sm:w-auto">
            Show route options <ArrowRight size={18} aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
