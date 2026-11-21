import { PROVIDERS, type ProviderId } from "@/lib/ai/meta";

/**
 * Where the user's API key lives:
 * - by default only in this JS module's memory (gone on refresh or tab close);
 * - with "Remember for this tab", in sessionStorage (cleared when the tab closes).
 * Never in localStorage, the URL, the saved trip state, or anything sent to our server.
 */
let memoryKey = "";
const KEY_STORAGE = "tre-giorni:ai-key";
const SETTINGS_STORAGE = "tre-giorni:ai-settings";

export interface AiSettings {
  provider: ProviderId;
  model: string;
  remember: boolean;
}

export function getKey(): string {
  if (memoryKey) return memoryKey;
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setKey(key: string, remember: boolean) {
  memoryKey = key;
  try {
    if (remember && key) sessionStorage.setItem(KEY_STORAGE, key);
    else sessionStorage.removeItem(KEY_STORAGE);
  } catch {
    // Storage blocked: the key still works for this page view.
  }
}

export function loadSettings(): AiSettings {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SETTINGS_STORAGE) ?? "null") as AiSettings | null;
    if (saved && saved.provider in PROVIDERS) return saved;
  } catch {
    // fall through to defaults
  }
  return { provider: "anthropic", model: PROVIDERS.anthropic.defaultModel, remember: false };
}

/** Provider and model are not secret; they are saved so the form remembers the choice. */
export function saveSettings(s: AiSettings) {
  try {
    sessionStorage.setItem(SETTINGS_STORAGE, JSON.stringify(s));
  } catch {
    // ignore
  }
}
