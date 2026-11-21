"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { DEFAULT_PRIORITIES, type Priority } from "@/lib/planner/types";
import { IconButton } from "../ui/controls";
import { cx } from "@/lib/cx";

export const PRIORITY_COPY: Record<Priority, { label: string; hint: string }> = {
  interests: { label: "My interests", hint: "Places that match the interests you picked" },
  rating: { label: "Top rated", hint: "The highest-rated places first" },
  hidden: { label: "Hidden gems", hint: "Local favourites over tourist magnets" },
  budget: { label: "Budget", hint: "Cheaper places first" },
  walking: { label: "Less walking", hint: "Keep each next stop close" },
};

/**
 * Ordered list of what matters most. Drag (mouse, touch, or keyboard: space to lift,
 * arrows to move) or use the up/down buttons. Position sets the weight: 5, 4, 3, 2, 1.
 */
export function PriorityList({ value, onChange }: { value: Priority[]; onChange: (v: Priority[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (from: number, to: number) => onChange(arrayMove(value, from, to));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) move(value.indexOf(active.id as Priority), value.indexOf(over.id as Priority));
  };
  const isDefault = value.join() === DEFAULT_PRIORITIES.join();

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value} strategy={verticalListSortingStrategy}>
          <ol className="overflow-hidden rounded border border-rule">
            {value.map((p, i) => (
              <Row key={p} id={p} index={i} count={value.length} onMove={move} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {!isDefault && (
        <button type="button" onClick={() => onChange(DEFAULT_PRIORITIES)} className="mt-2 text-sm text-paper-dim underline hover:text-paper">
          Reset to the default order
        </button>
      )}
    </div>
  );
}

function Row({ id, index, count, onMove }: { id: Priority; index: number; count: number; onMove: (a: number, b: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const weight = count - index;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        "flex items-center gap-3 border-b border-rule bg-night-2 px-2 py-2 last:border-b-0 odd:bg-night-3/60",
        isDragging && "relative z-10 bg-night-4 shadow-[0_8px_24px_rgb(0_0_0/0.45)]",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${PRIORITY_COPY[id].label}`}
        className="grid size-8 cursor-grab touch-none place-items-center rounded text-paper-faint hover:text-paper active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>
      <span className="board-label w-5 text-center text-xl text-signal">{index + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{PRIORITY_COPY[id].label}</span>
        <span className="block truncate text-sm text-paper-faint">{PRIORITY_COPY[id].hint}</span>
      </span>
      <span className="board-label hidden text-xs text-paper-faint sm:block" title="Weight in the ranking">
        ×{weight}
      </span>
      <IconButton label={`Move ${PRIORITY_COPY[id].label} up`} disabled={index === 0} onClick={() => onMove(index, index - 1)} className="disabled:opacity-25">
        <ArrowUp size={16} />
      </IconButton>
      <IconButton label={`Move ${PRIORITY_COPY[id].label} down`} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} className="disabled:opacity-25">
        <ArrowDown size={16} />
      </IconButton>
    </li>
  );
}
