"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer } from "react";
import { Board } from "./Board";
import { RouteOptions } from "./RouteOptions";
import { Setup } from "./Setup";
import { clearState, loadState, reducer, saveState, type Mode } from "./state";
import { Wordmark } from "./Wordmark";

/**
 * The whole planner flow: setup → route options → board.
 * Rendered client-only (see app/plan/TripLoader.tsx), so reading sessionStorage here is safe.
 * `mode` comes from the URL; the loader keys this component by mode so a mode change remounts it.
 */
export default function TripApp({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, mode, loadState);

  // Block bodies on purpose: an effect must return nothing or a cleanup function,
  // and window.scrollTo() returns a Promise in recent browsers.
  useEffect(() => {
    saveState(state);
  }, [state]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.step]);

  const startOver = () => {
    clearState();
    router.push("/");
  };

  if (state.step === "board" && state.itinerary) return <Board state={state} dispatch={dispatch} onStartOver={startOver} />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark />
          <ol className="board-label flex gap-4 text-[13px]" aria-label="Progress">
            {(["setup", "routes", "board"] as const).map((s, i) => (
              <li key={s} aria-current={state.step === s ? "step" : undefined} className={state.step === s ? "text-signal" : "text-paper-faint"}>
                {i + 1} {s === "setup" ? "Preferences" : s === "routes" ? "Route" : "Plan"}
              </li>
            ))}
          </ol>
        </div>
      </header>
      {state.step === "setup" && <Setup state={state} dispatch={dispatch} />}
      {state.step === "routes" && <RouteOptions state={state} dispatch={dispatch} />}
    </div>
  );
}
