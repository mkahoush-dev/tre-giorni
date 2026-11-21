"use client";

import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { GripVertical, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PLACES, PLACE_BY_ID } from "@/lib/catalog";
import { DAY_TRIPS } from "@/lib/planner/constants";
import { dateBlocker, tripDates } from "@/lib/planner/rules";
import type { Place } from "@/lib/types";
import { cx } from "@/lib/cx";
import { WEEKDAY, placeMeta } from "./format";

const LANE_ID = "must-see-lane";

/** Why a place can't happen on any of the trip's dates, if so. */
function availability(p: Place, startDate: string): string | null {
  const dates = tripDates(startDate);
  const blockers = dates.map((d) => dateBlocker(p, d));
  if (blockers.some((b) => b === null)) return null;
  if (blockers.includes("out-of-season")) return "Closed in this season";
  return `Closed ${dates.map((d) => WEEKDAY[d.weekday]).join(", ")}`;
}

/**
 * Drag places into the must-see lane, or press "Add" (keyboard/touch alternative).
 * Problems with the trip dates are shown immediately, before planning.
 */
export function MustSeePicker({ value, startDate, onChange }: { value: string[]; startDate: string; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const add = (id: string) => !value.includes(id) && onChange([...value, id]);
  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLACES.filter((p) => !value.includes(p.id))
      .filter((p) => !q || `${p.name} ${p.city} ${p.type} ${p.tags.join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
      .slice(0, 40);
  }, [query, value]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (over?.id === LANE_ID) add(String(active.id));
  };

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragging(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col rounded border border-rule bg-night-2">
          <label className="flex items-center gap-2 border-b border-rule px-3">
            <Search size={16} className="text-paper-faint" aria-hidden />
            <span className="sr-only">Search places</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 103 places: Uffizi, gelato, Venice…"
              className="h-11 w-full bg-transparent text-[15px] placeholder:text-paper-faint focus:outline-none"
            />
          </label>
          {/* relative: keeps the sr-only labels (position: absolute) inside the scroll box instead of stretching the page. */}
          <ul className="relative max-h-80 overflow-y-auto" aria-label="Places">
            {results.map((p) => (
              <SourceRow key={p.id} place={p} warning={availability(p, startDate)} onAdd={() => add(p.id)} />
            ))}
            {!results.length && <li className="px-4 py-6 text-sm text-paper-faint">No places match “{query}”.</li>}
          </ul>
        </div>

        <Lane value={value} startDate={startDate} onRemove={remove} />
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="rounded border border-signal bg-night-4 px-3 py-2 font-semibold shadow-[0_12px_32px_rgb(0_0_0/0.5)]">
            {PLACE_BY_ID.get(dragging)?.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SourceRow({ place, warning, onAdd }: { place: Place; warning: string | null; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: place.id });
  const trip = DAY_TRIPS[place.city];
  return (
    <li ref={setNodeRef} className={cx("flex items-center gap-2 border-b border-rule px-2 py-2 last:border-b-0", isDragging && "opacity-40")}>
      <span
        {...listeners}
        {...attributes}
        role="presentation"
        tabIndex={-1}
        className="grid size-8 shrink-0 cursor-grab touch-none place-items-center text-paper-faint hover:text-paper"
      >
        <GripVertical size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{place.name}</span>
        <span className="block truncate text-sm text-paper-faint">
          {placeMeta(place)} · {place.rating}
          {trip && ` · Day trip from ${trip.hub}`}
          {warning && <span className="text-[#ff8a9a]"> · {warning}</span>}
        </span>
        <span className="block truncate text-sm text-paper-faint" title={place.description}>
          {place.description}
        </span>
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded border border-rule px-2.5 text-sm font-semibold text-paper-dim hover:border-signal hover:text-signal"
      >
        <Plus size={14} aria-hidden /> Add<span className="sr-only"> {place.name} to must-sees</span>
      </button>
    </li>
  );
}

function Lane({ value, startDate, onRemove }: { value: string[]; startDate: string; onRemove: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: LANE_ID });
  return (
    <div
      ref={setNodeRef}
      className={cx(
        "flex min-h-40 flex-col rounded border-2 border-dashed p-3 transition-colors",
        isOver ? "border-signal bg-signal-soft" : "border-rule",
      )}
    >
      <p className="board-label mb-2 text-sm text-paper-dim">
        Must-see · {value.length}
      </p>
      {!value.length && (
        <p className="m-auto max-w-56 text-center text-sm text-paper-faint">Drag places here, or press Add. The plan will be built around them.</p>
      )}
      <ul className="flex flex-col gap-2">
        {value.map((id) => {
          const p = PLACE_BY_ID.get(id);
          if (!p) return null;
          const warning = availability(p, startDate);
          return (
            <li key={id} className={cx("flex items-center gap-2 rounded bg-night-3 py-1.5 pl-3 pr-1", warning && "ring-1 ring-stop")}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="block truncate text-sm text-paper-faint">
                  {placeMeta(p)}
                  {warning && <span className="text-[#ff8a9a]"> · {warning}: try other dates</span>}
                </span>
              </span>
              <button type="button" onClick={() => onRemove(id)} aria-label={`Remove ${p.name}`} className="grid size-8 place-items-center rounded text-paper-dim hover:bg-night-4 hover:text-paper">
                <X size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
