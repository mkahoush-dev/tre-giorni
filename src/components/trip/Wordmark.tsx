import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/" className="font-board text-2xl font-bold uppercase tracking-[0.06em] text-paper no-underline">
      Tre <span className="text-signal">Giorni</span>
    </Link>
  );
}
