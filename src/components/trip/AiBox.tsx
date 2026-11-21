"use client";

import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useState, type Dispatch } from "react";
import { MAX_INPUT_CHARS, interpretWishes } from "@/lib/ai/interpret";
import { AiError, PROVIDERS, type ProviderId } from "@/lib/ai/meta";
import type { ValidationResult } from "@/lib/ai/schema";
import { PLACE_BY_ID } from "@/lib/catalog";
import { Button } from "../ui/controls";
import { getKey, loadSettings, saveSettings, setKey, type AiSettings } from "./aiKey";
import type { Action } from "./state";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "done"; result: ValidationResult } | { kind: "error"; message: string };

/**
 * Optional: describe the trip in your own words, and an LLM (with your own key)
 * fills in the form above. The form stays the source of truth; you can change anything after.
 */
export function AiBox({ dispatch }: { dispatch: Dispatch<Action> }) {
  const [settings, setSettings] = useState<AiSettings>(loadSettings);
  const [key, setKeyState] = useState(getKey);
  const [showKey, setShowKey] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const provider = PROVIDERS[settings.provider];

  const update = (patch: Partial<AiSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    if (patch.remember !== undefined) setKey(key, next.remember);
  };

  const run = async () => {
    setKey(key, settings.remember);
    setStatus({ kind: "loading" });
    try {
      const result = await interpretWishes(settings.provider, key, settings.model, text);
      dispatch({ type: "apply-wishes", wishes: result.wishes });
      setStatus({ kind: "done", result });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof AiError ? e.message : "Something went wrong. Try again." });
    }
  };

  const keyLooksWrong = key.length > 0 && provider.keyPrefix && !key.startsWith(provider.keyPrefix);

  return (
    <section className="rounded border border-rule bg-night-2 p-5" aria-labelledby="ai-box-title">
      <h2 id="ai-box-title" className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles size={18} className="text-signal" aria-hidden /> Or describe your trip in your own words
      </h2>
      <p className="mt-1 text-[15px] text-paper-dim">
        An AI reads your description and fills in the form above. It can only pick places from our list, and you can change anything afterwards.
      </p>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="grid gap-1 text-sm text-paper-dim">
          Provider
          <select
            value={settings.provider}
            onChange={(e) => {
              const p = e.target.value as ProviderId;
              update({ provider: p, model: PROVIDERS[p].defaultModel });
            }}
            className="h-10 rounded border border-rule bg-night-3 px-2 text-[15px] text-paper"
          >
            {(Object.keys(PROVIDERS) as ProviderId[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDERS[p].label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-paper-dim">
          Model
          <input
            value={settings.model}
            onChange={(e) => update({ model: e.target.value })}
            spellCheck={false}
            className="h-10 rounded border border-rule bg-night-3 px-3 font-mono text-sm text-paper"
          />
        </label>
        <label className="grid gap-1 text-sm text-paper-dim">
          <span className="flex items-center justify-between">
            Your API key
            <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="text-xs text-paper-faint underline hover:text-paper">
              Get a key
            </a>
          </span>
          <span className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={key}
              onChange={(e) => setKeyState(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder={provider.keyPrefix ? `${provider.keyPrefix}…` : "Paste your key"}
              className="h-10 w-full rounded border border-rule bg-night-3 pl-3 pr-10 font-mono text-sm text-paper placeholder:text-paper-faint"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? "Hide key" : "Show key"}
              className="absolute right-1 top-1 grid size-8 place-items-center rounded text-paper-faint hover:text-paper"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
        <p className="flex items-center gap-1.5 text-paper-faint">
          <ShieldCheck size={15} className="shrink-0 text-go" aria-hidden />
          Your key goes straight from your browser to {provider.label.split(" ")[0]}. This site&rsquo;s server never sees it.
        </p>
        <label className="flex items-center gap-2 text-paper-dim">
          <input type="checkbox" checked={settings.remember} onChange={(e) => update({ remember: e.target.checked })} className="accent-[#f4c430]" />
          Remember for this tab
        </label>
      </div>
      {keyLooksWrong && <p className="mt-1 text-sm text-[#ff8a9a]">That doesn&rsquo;t look like a {provider.label} key (they start with “{provider.keyPrefix}”).</p>}

      <label htmlFor="ai-text" className="sr-only">
        Describe your trip
      </label>
      <textarea
        id="ai-text"
        rows={3}
        maxLength={MAX_INPUT_CHARS}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="“We love wine and quiet places, hate crowds, we’re on a budget, and we must see the David.”"
        className="mt-4 w-full resize-y rounded border border-rule bg-night-3 p-3 text-[15px] placeholder:text-paper-faint"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-paper-faint tabular-nums">
          {text.length}/{MAX_INPUT_CHARS}
        </span>
        <Button variant="secondary" onClick={run} disabled={!key.trim() || !text.trim() || status.kind === "loading"}>
          {status.kind === "loading" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <KeyRound size={16} aria-hidden />}
          {status.kind === "loading" ? "Reading your description…" : "Fill in the form"}
        </Button>
      </div>

      <div aria-live="polite">
        {status.kind === "error" && (
          <p role="alert" className="mt-3 rounded border border-stop bg-stop-soft px-3 py-2 text-[15px]">
            {status.message}
          </p>
        )}
        {status.kind === "done" && <AiResult result={status.result} />}
      </div>
    </section>
  );
}

function AiResult({ result }: { result: ValidationResult }) {
  const { wishes, droppedIds } = result;
  return (
    <div className="mt-3 rounded border border-go/60 bg-go/10 px-4 py-3 text-[15px]">
      <p className="flex items-start gap-2 font-semibold">
        <Check size={18} className="mt-0.5 shrink-0 text-go" aria-hidden /> {wishes.summary}
      </p>
      <p className="mt-1 text-sm text-paper-dim">
        Form updated
        {wishes.mustSee.length > 0 && ` · added ${wishes.mustSee.map((id) => PLACE_BY_ID.get(id)?.name).join(", ")}`}
        . Check the choices above, then continue.
      </p>
      {droppedIds.length > 0 && (
        <p className="mt-1 text-sm text-paper-faint">Ignored {droppedIds.length} place reference(s) that aren&rsquo;t in our list.</p>
      )}
    </div>
  );
}
