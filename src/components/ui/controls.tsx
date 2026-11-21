"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-[15px]",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary" && "bg-signal text-night hover:bg-[#ffd451] active:bg-[#e0b21f]",
        variant === "secondary" && "border border-rule bg-night-3 text-paper hover:border-paper-faint hover:bg-night-4",
        variant === "ghost" && "text-paper-dim hover:bg-night-3 hover:text-paper",
        variant === "danger" && "text-paper-dim hover:bg-stop-soft hover:text-paper",
        className,
      )}
    />
  );
}

export function IconButton({
  label,
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...props}
      className={cx(
        "grid size-8 place-items-center rounded text-paper-dim transition-colors hover:bg-night-4 hover:text-paper",
        active && "bg-signal-soft text-signal hover:bg-signal-soft hover:text-signal",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A single-choice row of options (radio group semantics). */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded border border-rule bg-night-2 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex-1 rounded px-3 py-2 text-left transition-colors",
              on ? "bg-signal text-night" : "text-paper-dim hover:bg-night-3 hover:text-paper",
            )}
          >
            <span className="block text-[15px] font-semibold">{o.label}</span>
            {o.hint && <span className={cx("block text-xs", on ? "text-night/75" : "text-paper-faint")}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "h-9 rounded-full border px-4 text-[15px] font-medium transition-colors",
        on ? "border-signal bg-signal text-night" : "border-rule text-paper-dim hover:border-paper-faint hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ children, hint, htmlFor }: { children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <label htmlFor={htmlFor} className="board-label text-[15px] text-signal">
        {children}
      </label>
      {hint && <span className="text-sm text-paper-faint">{hint}</span>}
    </div>
  );
}

