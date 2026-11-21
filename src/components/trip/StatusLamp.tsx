import type { Flag } from "@/lib/planner/types";
import { cx } from "@/lib/cx";
import { FLAG_LABEL } from "./format";

/**
 * Status lamps follow one rule: solid = a verified fact you must act on,
 * dashed = something the data doesn't confirm. Colour is never the only signal.
 */
export function StatusLamp({
  kind,
  children,
  title,
}: {
  kind: "open" | "book" | "unsure" | "train" | "train-estimate" | "conflict";
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "board-label inline-flex h-6 w-fit items-center justify-self-start whitespace-nowrap rounded-sm px-2 text-[13px] tracking-[0.08em]",
        kind === "open" && "bg-go text-paper",
        kind === "book" && "bg-signal text-night",
        kind === "unsure" && "border border-dashed border-paper-dim text-paper-dim",
        kind === "train" && "bg-stop text-paper",
        kind === "train-estimate" && "border border-dashed border-[#ff8a9a] text-paper",
        kind === "conflict" && "border border-stop text-paper",
      )}
    >
      {children}
    </span>
  );
}

/** The (at most two) most important lamps for a visit. */
export function VisitLamps({ flags, max = 2 }: { flags: Flag[]; max?: number }) {
  const order: Flag[] = ["book-ahead", "hours-assumed", "hours-inferred", "booking-unknown", "duration-assumed", "outside-best-months", "location-approximate"];
  const shown = order.filter((f) => flags.includes(f)).slice(0, max);
  if (!shown.length) return <StatusLamp kind="open">Open</StatusLamp>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {shown.map((f) => (
        <StatusLamp key={f} kind={FLAG_LABEL[f].tone} title={FLAG_LABEL[f].long}>
          {FLAG_LABEL[f].short}
        </StatusLamp>
      ))}
    </span>
  );
}
