"use client";

import { ArrowLeftRight, Bus, Footprints, Lock, LockOpen, Map as MapIcon, RefreshCw, RotateCcw, Star, TrainFront, Trash2, X } from "lucide-react";
import { Fragment, useMemo, useState, useSyncExternalStore, type Dispatch } from "react";
import { PLACES, PLACE_BY_ID } from "@/lib/catalog";
import { DAY_END, DAY_START, INTEREST_LABELS } from "@/lib/planner/constants";
import { alternativesFor } from "@/lib/planner/plan";
import type { DayPlan, Item, Visit } from "@/lib/planner/types";
import { Button, IconButton } from "../ui/controls";
import { cx } from "@/lib/cx";
import { BeforeYouGo } from "./BeforeYouGo";
import DayMap, { type MapStop } from "./DayMap";
import { WEEKDAY, clock, duration, price, shortDate, TYPE_LABEL } from "./format";
import { StatusLamp, VisitLamps } from "./StatusLamp";
import type { Action, TripState } from "./state";
import { Wordmark } from "./Wordmark";

const FREE_TIME_MIN = 45;

/** True on wide screens. Used so only one map instance is ever mounted (Leaflet breaks in hidden containers). */
function useWide() {
  const query = "(min-width: 1024px)";
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
const COLS = "md:grid-cols-[6.5rem_minmax(0,1fr)_5.5rem_8rem_9.5rem_6.75rem]";

export function Board({ state, dispatch, onStartOver }: { state: TripState; dispatch: Dispatch<Action>; onStartOver: () => void }) {
  const it = state.itinerary!;
  const day = it.days[state.activeDay];
  const [mapOpen, setMapOpen] = useState(false);
  const wide = useWide();

  const stops: MapStop[] = useMemo(
    () =>
      day.items
        .filter((i): i is Visit => i.kind === "visit")
        .map((v) => {
          const p = PLACE_BY_ID.get(v.placeId)!;
          return { id: p.id, name: p.name, lat: p.lat, lng: p.lng, approximate: p.locationApproximate };
        }),
    [day],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header state={state} dispatch={dispatch} onStartOver={onStartOver} />

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <main className="min-w-0 px-4 pb-16 pt-5 sm:px-7">
          {it.conflicts.length > 0 && (
            <div role="alert" className="mb-5 grid gap-2 rounded border border-stop bg-stop-soft p-4">
              {it.conflicts.map((c) => (
                <p key={c.message} className="flex items-start gap-3">
                  <StatusLamp kind="train">Conflict</StatusLamp>
                  <span>{c.message}</span>
                </p>
              ))}
            </div>
          )}

          <DayTabs days={it.days} active={state.activeDay} onSelect={(d) => dispatch({ type: "set-day", day: d })} />

          <div role="tabpanel" id={`day-panel-${state.activeDay}`} aria-labelledby={`day-tab-${state.activeDay}`}>
            <div className={cx("board-label hidden border-b-2 border-signal px-4 py-2 text-[13px] text-signal md:grid md:gap-4", COLS)}>
              <span>Time</span>
              <span>Stop</span>
              <span>Duration</span>
              <span>Price · Rating</span>
              <span>Status</span>
              <span className="sr-only">Actions</span>
            </div>
            <BoardRows day={day} dayIndex={state.activeDay} state={state} dispatch={dispatch} />
          </div>

          <Button variant="secondary" className="mt-6 lg:hidden" onClick={() => setMapOpen((o) => !o)} aria-expanded={mapOpen}>
            <MapIcon size={16} aria-hidden /> {mapOpen ? "Hide map" : "Show map"}
          </Button>
          {mapOpen && !wide && (
            <div className="mt-3 h-72 overflow-hidden rounded border border-rule lg:hidden">
              <DayMap key={state.activeDay} stops={stops} />
            </div>
          )}
          <div className="mt-6 rounded border border-rule bg-night-2 lg:hidden">
            <BeforeYouGo itinerary={it} />
          </div>
        </main>

        <aside className="hidden border-l border-rule lg:flex lg:flex-col">
          <div className="h-80 shrink-0 border-b border-rule">{wide && <DayMap key={state.activeDay} stops={stops} />}</div>
          <div className="flex-1 overflow-y-auto">
            <BeforeYouGo itinerary={it} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Header({ state, dispatch, onStartOver }: { state: TripState; dispatch: Dispatch<Action>; onStartOver: () => void }) {
  const it = state.itinerary!;
  const [confirming, setConfirming] = useState(false);
  const first = it.days[0];
  const last = it.days[2];
  const anyLocked = it.days.some((d) => d.items.some((i) => i.kind === "visit" && i.locked));

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-night/95 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-7">
        <Wordmark />
        <div className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
          <p className="truncate font-semibold">{it.route.label}</p>
          <p className="truncate text-sm text-paper-dim">
            {WEEKDAY[first.weekday]} {shortDate(first.date)} – {WEEKDAY[last.weekday]} {shortDate(last.date)}
            {state.input.interests.length > 0 && ` · ${state.input.interests.map((i) => INTEREST_LABELS[i]).join(", ")}`}
            {` · ${state.input.pace}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto sm:ml-0" onClick={() => dispatch({ type: "back-to", step: "routes" })}>
          Other routes
        </Button>
        <Button variant="primary" onClick={() => dispatch({ type: "regenerate" })} title="Re-plan every stop you haven't locked">
          <RefreshCw size={16} aria-hidden /> Regenerate {anyLocked ? "unlocked" : "plan"}
        </Button>
        {/* Destructive action kept apart from everything else, and it asks twice. */}
        <div className="sm:ml-8">
          {confirming ? (
            <span className="flex items-center gap-1">
              <Button variant="danger" size="sm" onClick={onStartOver} className="text-paper ring-1 ring-stop">
                Discard plan
              </Button>
              <IconButton label="Keep plan" onClick={() => setConfirming(false)}>
                <X size={16} />
              </IconButton>
            </span>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
              <RotateCcw size={14} aria-hidden /> Start over
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function DayTabs({ days, active, onSelect }: { days: DayPlan[]; active: number; onSelect: (d: number) => void }) {
  return (
    <div role="tablist" aria-label="Days" className="mb-4 grid grid-cols-3 gap-1">
      {days.map((d, i) => {
        const busy = d.items.reduce((sum, item) => sum + (item.end - item.start), 0);
        const fullness = Math.min(1, busy / (DAY_END - DAY_START));
        const on = i === active;
        const trains = d.items.filter((x) => x.kind === "travel" && x.mode === "train");
        const arrival = trains.find((t) => t.kind === "travel" && t.to === d.city && t.start === d.items[0]?.start);
        const excursion = trains.find((t) => t.kind === "travel" && t.from === d.city);
        const from = arrival && arrival.kind === "travel" ? arrival.from : null;
        const tripTo = excursion && excursion.kind === "travel" ? excursion.to : null;
        return (
          <button
            key={d.date}
            id={`day-tab-${i}`}
            role="tab"
            aria-selected={on}
            aria-controls={`day-panel-${i}`}
            onClick={() => onSelect(i)}
            className={cx(
              "relative overflow-hidden rounded-t px-3 pb-3 pt-2 text-left transition-colors sm:px-4",
              on ? "bg-signal text-night" : "bg-night-3 text-paper-dim hover:bg-night-4 hover:text-paper",
            )}
          >
            <span className="board-label block truncate text-[13px] opacity-80">
              <span className="hidden sm:inline">Day {i + 1} · </span>
              {WEEKDAY[d.weekday]} {shortDate(d.date)}
            </span>
            <span className="block truncate font-board text-lg font-bold uppercase tracking-[0.04em] sm:text-xl">
              {from && <span className="hidden sm:inline">{from} → </span>}
              {d.city}
            </span>
            {tripTo && <span className="block truncate text-sm opacity-80">Day trip to {tripTo}</span>}
            {/* How full the day is: visible before opening it. */}
            <span className="absolute inset-x-0 bottom-0 h-1" aria-hidden title={`${Math.round(fullness * 100)}% of the day planned`}>
              <span className={cx("block h-full", on ? "bg-night/60" : "bg-signal")} style={{ width: `${fullness * 100}%` }} />
            </span>
            <span className="sr-only">{Math.round(fullness * 100)}% of the day planned</span>
          </button>
        );
      })}
    </div>
  );
}

function BoardRows({ day, dayIndex, state, dispatch }: { day: DayPlan; dayIndex: number; state: TripState; dispatch: Dispatch<Action> }) {
  const [swapping, setSwapping] = useState<number | null>(null);
  const visits = day.items.filter((i) => i.kind === "visit").length;

  if (!visits) {
    return <p className="px-4 py-10 text-paper-dim">Nothing planned this day. Regenerate, or go back and loosen your budget or pace.</p>;
  }

  // Stop numbers match the numbered map markers.
  const stopNumbers = new Map<number, number>();
  day.items.forEach((item, i) => item.kind === "visit" && stopNumbers.set(i, stopNumbers.size + 1));
  return (
    <ol>
      {day.items.map((item, index) => {
        const prev: Item | undefined = day.items[index - 1];
        const gap = prev ? item.start - prev.end : 0;
        return (
          <Fragment key={`${index}-${item.kind === "visit" ? item.placeId : item.to}`}>
            {gap >= FREE_TIME_MIN && <FreeTime minutes={gap} />}
            {item.kind === "travel" ? (
              <TravelRow item={item} />
            ) : (
              <VisitRow
                visit={item}
                number={stopNumbers.get(index)!}
                shaded={stopNumbers.get(index)! % 2 === 1}
                changed={state.changed.includes(item.placeId)}
                swapping={swapping === index}
                onSwap={() => setSwapping(swapping === index ? null : index)}
                onLock={() => dispatch({ type: "toggle-lock", day: dayIndex, item: index })}
                onRemove={() => {
                  setSwapping(null);
                  dispatch({ type: "remove", day: dayIndex, item: index });
                }}
                onSeen={() => dispatch({ type: "seen", placeId: item.placeId })}
              >
                {swapping === index && (
                  <SwapPanel
                    state={state}
                    dayIndex={dayIndex}
                    itemIndex={index}
                    onPick={(alt) => {
                      setSwapping(null);
                      dispatch({ type: "swap", day: dayIndex, item: index, alt });
                    }}
                    onClose={() => setSwapping(null)}
                  />
                )}
              </VisitRow>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

function VisitRow({
  visit,
  number,
  shaded,
  changed,
  swapping,
  onSwap,
  onLock,
  onRemove,
  onSeen,
  children,
}: {
  visit: Visit;
  number: number;
  shaded: boolean;
  changed: boolean;
  swapping: boolean;
  onSwap: () => void;
  onLock: () => void;
  onRemove: () => void;
  onSeen: () => void;
  children?: React.ReactNode;
}) {
  const p = PLACE_BY_ID.get(visit.placeId)!;
  const slotLabel = visit.slot === "lunch" ? "Lunch" : visit.slot === "dinner" ? "Dinner" : null;
  return (
    <li
      onMouseLeave={changed ? onSeen : undefined}
      onClick={changed ? onSeen : undefined}
      onBlur={changed ? onSeen : undefined}
      className={cx("border-b border-rule", shaded && "bg-night-2", changed && "row-changed row-settle", swapping && "bg-night-3")}
    >
      <div className={cx("grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3.5 md:items-center", COLS)}>
        <div className="row-span-2 md:row-span-1">
          <span className="block font-board text-2xl font-bold leading-none text-signal tabular-nums sm:text-[28px]">{clock(visit.start)}</span>
          <span className="mt-1 block text-xs text-paper-faint tabular-nums">to {clock(visit.end)}</span>
        </div>

        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="board-label text-xs text-paper-faint">{number}</span>
            <span className="text-lg font-semibold leading-snug">{p.name}</span>
            {slotLabel && <span className="board-label text-xs text-signal">{slotLabel}</span>}
          </p>
          <p className="truncate text-sm text-paper-dim">
            {visit.reasons.join(" · ")}
            <span className="text-paper-faint"> · {TYPE_LABEL[p.type] ?? p.type}{p.neighborhood ? `, ${p.neighborhood}` : ""}</span>
          </p>
          <p className="mt-1 line-clamp-2 max-w-[68ch] text-sm text-paper-faint" title={p.description}>
            {p.description}
          </p>
        </div>

        <div className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-2 md:contents">
          <span className="text-[15px] tabular-nums">{duration(p.duration.minutes)}</span>
          <span className="text-[15px] tabular-nums">
            {price(p.price)}
            <span className="ml-2 inline-flex items-center gap-1 text-paper-dim" aria-label={`Rated ${p.rating} out of 5`} title={`Rated ${p.rating} out of 5`}>
              <Star size={13} className="fill-current text-signal" aria-hidden />
              {p.rating}
            </span>
          </span>
          <VisitLamps flags={visit.flags} />
          <span className="ml-auto flex items-center gap-0.5 md:ml-0 md:justify-end">
            <IconButton label={swapping ? "Close alternatives" : `Swap ${p.name}`} active={swapping} onClick={onSwap} aria-expanded={swapping}>
              <ArrowLeftRight size={16} />
            </IconButton>
            <IconButton label={visit.locked ? `Unlock ${p.name}` : `Lock ${p.name}`} active={visit.locked} onClick={onLock}>
              {visit.locked ? <Lock size={16} /> : <LockOpen size={16} />}
            </IconButton>
            <IconButton label={`Remove ${p.name}`} onClick={onRemove} className="hover:bg-stop-soft">
              <Trash2 size={16} />
            </IconButton>
          </span>
        </div>
      </div>
      {children}
    </li>
  );
}

function SwapPanel({
  state,
  dayIndex,
  itemIndex,
  onPick,
  onClose,
}: {
  state: TripState;
  dayIndex: number;
  itemIndex: number;
  onPick: (alt: ReturnType<typeof alternativesFor>[number]) => void;
  onClose: () => void;
}) {
  const alts = useMemo(
    () => alternativesFor(state.itinerary!, state.input, dayIndex, itemIndex, PLACES),
    [state.itinerary, state.input, dayIndex, itemIndex],
  );
  return (
    <div className="border-t border-rule bg-night-3 px-4 pb-4 pt-3 md:pl-[8.5rem]">
      <div className="mb-2 flex items-center justify-between">
        <p className="board-label text-[13px] text-paper-dim">Fits this time slot without moving anything else</p>
        <IconButton label="Close alternatives" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      {!alts.length && <p className="py-2 text-[15px] text-paper-dim">Nothing else is open and close enough for this slot. Try removing it to free the time.</p>}
      <ul className="grid gap-1">
        {alts.map((a) => (
          <li key={a.place.id}>
            <button
              type="button"
              onClick={() => onPick(a)}
              className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded px-2 py-2 text-left hover:bg-night-4"
            >
              <span className="font-board text-lg font-bold text-signal tabular-nums">{clock(a.start)}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{a.place.name}</span>
                <span className="block truncate text-sm text-paper-dim">
                  {a.reasons.join(" · ")} · {duration(a.place.duration.minutes)} · {price(a.place.price)}
                </span>
                <span className="block truncate text-sm text-paper-faint" title={a.place.description}>
                  {a.place.description}
                </span>
              </span>
              <span className="board-label text-xs text-paper-dim">Use this</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TravelRow({ item }: { item: Extract<Item, { kind: "travel" }> }) {
  const minutes = item.end - item.start;
  if (item.mode === "train") {
    return (
      <li className="border-b border-rule bg-stop-soft">
        <div className={cx("grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-4 py-3", COLS)}>
          <span className="font-board text-2xl font-bold leading-none text-paper tabular-nums sm:text-[28px]">{clock(item.start)}</span>
          <span className="flex min-w-0 items-center gap-2 font-semibold">
            <TrainFront size={18} aria-hidden className="shrink-0" />
            <span className="truncate">
              Train {item.from} → {item.to}
            </span>
          </span>
          <span className="col-start-2 flex items-center gap-4 md:contents">
            <span className="text-[15px] tabular-nums">~{duration(minutes)}</span>
            <span className="text-sm text-paper-dim">arr. {clock(item.end)}</span>
            <StatusLamp kind="train-estimate" title="Typical high-speed time; check the real timetable">
              Time est.
            </StatusLamp>
          </span>
        </div>
      </li>
    );
  }
  const Icon = item.mode === "walk" ? Footprints : Bus;
  return (
    <li className="flex items-center gap-2 border-b border-rule px-4 py-1.5 text-sm text-paper-faint md:pl-[8.5rem]">
      <Icon size={14} aria-hidden />
      {minutes} min {item.mode === "walk" ? "walk" : "by bus or taxi (est.)"}
    </li>
  );
}

function FreeTime({ minutes }: { minutes: number }) {
  return (
    <li className="border-b border-dashed border-rule px-4 py-2 text-sm text-paper-faint md:pl-[8.5rem]">
      Free time · {duration(minutes)}
    </li>
  );
}
