import { PLACE_BY_ID } from "@/lib/catalog";
import type { Flag, Itinerary, Visit } from "@/lib/planner/types";
import { WEEKDAY, price } from "./format";

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

interface Entry {
  key: string;
  name: string;
  day: string;
  detail?: string;
}

function collect(it: Itinerary) {
  const visits = it.days.flatMap((d) =>
    d.items.filter((i): i is Visit => i.kind === "visit").map((v) => ({ v, day: `${WEEKDAY[d.weekday]} ${Number(d.date.slice(8, 10))}`, place: PLACE_BY_ID.get(v.placeId)! })),
  );
  const withFlag = (...flags: Flag[]): Entry[] =>
    visits.filter(({ v }) => flags.some((f) => v.flags.includes(f))).map(({ v, day, place }) => ({ key: v.placeId, name: place.name, day }));

  return {
    book: withFlag("book-ahead"),
    bookingUnknown: withFlag("booking-unknown"),
    hours: visits
      .filter(({ v }) => v.flags.includes("hours-assumed") || v.flags.includes("hours-inferred"))
      .map(({ v, day, place }) => ({
        key: v.placeId,
        name: place.name,
        day,
        detail: place.hours.raw ? `listed as “${place.hours.raw}”` : "no hours listed",
      })),
    duration: withFlag("duration-assumed"),
    seasonal: visits
      .filter(({ place }) => place.seasonal.note)
      .map(({ v, day, place }) => ({ key: v.placeId, name: place.name, day, detail: place.seasonal.note! })),
    trains: it.days.some((d) => d.items.some((i) => i.kind === "travel" && i.mode === "train")),
  };
}

function Group({ title, tone, entries, note }: { title: string; tone: "solid" | "dashed"; entries: Entry[]; note?: string }) {
  if (!entries.length) return null;
  return (
    <section className="border-t border-rule px-5 py-4">
      <h3 className="board-label flex items-center gap-2 text-sm text-paper">
        <span className={tone === "solid" ? "size-2.5 rounded-sm bg-signal" : "size-2.5 rounded-sm border border-dashed border-paper-dim"} aria-hidden />
        {title}
        <span className="font-sans text-xs font-normal normal-case tracking-normal text-paper-faint">· {plural(entries.length, "place")}</span>
      </h3>
      {note && <p className="mt-1 text-sm text-paper-faint">{note}</p>}
      <ul className="mt-2 grid gap-1.5 text-[15px]">
        {entries.map((e) => (
          <li key={e.key} className="flex gap-3">
            <span className="board-label w-12 shrink-0 pt-0.5 text-xs text-paper-faint" title="Planned day">{e.day}</span>
            <span>
              {e.name}
              {e.detail && <span className="block text-sm text-paper-faint">{e.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** How many planned stops sit at each price level (the data has € levels, not exact prices). */
function costProfile(it: Itinerary): { level: number; count: number }[] {
  const counts = [0, 0, 0, 0];
  for (const d of it.days) for (const i of d.items) if (i.kind === "visit") counts[PLACE_BY_ID.get(i.placeId)!.price - 1] += 1;
  return counts.map((count, i) => ({ level: i + 1, count })).filter((c) => c.count > 0);
}

function CostProfile({ itinerary }: { itinerary: Itinerary }) {
  const profile = costProfile(itinerary);
  const stops = profile.reduce((n, c) => n + c.count, 0);
  return (
    <section className="border-t border-rule px-5 py-4" aria-label="Trip cost profile">
      <h3 className="board-label text-sm text-paper">Trip cost profile · {stops} stops</h3>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {profile.map((c) => (
          <li key={c.level} className="text-[15px] tabular-nums">
            <b className="font-board text-lg text-signal">{c.count}</b> <span className="text-paper-dim">×</span> {price(c.level)}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-sm text-paper-faint">Price levels from the data; exact prices aren&rsquo;t listed.</p>
    </section>
  );
}

/** Everything the traveller must do or double-check, in one list. */
export function BeforeYouGo({ itinerary }: { itinerary: Itinerary }) {
  const g = collect(itinerary);
  const groups = [g.book, g.bookingUnknown, g.hours, g.duration, g.seasonal];
  const checks = groups.reduce((n, list) => n + list.length, 0) + (g.trains ? 1 : 0);
  const places = new Set(groups.flat().map((e) => e.key)).size;
  return (
    <div>
      <div className="px-5 pb-3 pt-4">
        <h2 className="board-label text-[15px] text-signal">Before you go</h2>
        <p className="mt-1 text-sm text-paper-dim">
          {plural(checks, "thing")} to check{places > 0 && ` across ${plural(places, "stop")}`}. A stop can appear in more than one list.
        </p>
      </div>
      <CostProfile itinerary={itinerary} />
      <Group title="Book ahead" tone="solid" entries={g.book} />
      <Group title="Check if booking is needed" tone="dashed" entries={g.bookingUnknown} note="The data doesn't say." />
      <Group title="Hours not confirmed" tone="dashed" entries={g.hours} note="Scheduled with a sensible default. Check before going." />
      <Group title="Visit length estimated" tone="dashed" entries={g.duration} />
      <Group title="Seasonal notes" tone="dashed" entries={g.seasonal} />
      {g.trains && (
        <section className="border-t border-rule px-5 py-4">
          <h3 className="board-label flex items-center gap-2 text-sm text-paper">
            <span className="size-2.5 rounded-sm bg-stop" aria-hidden /> Trains
          </h3>
          <p className="mt-1 text-[15px] text-paper-dim">Times are typical high-speed estimates. Check Trenitalia or Italo and book a seat.</p>
        </section>
      )}
    </div>
  );
}
