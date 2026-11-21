import { AiError, type ProviderId } from "./meta";
import { validateWishes, type ValidationResult } from "./schema";

export const MAX_INPUT_CHARS = 1500;

/**
 * The single LLM step in the app: free text -> checked preferences.
 * Provider call (untrusted) -> schema + dataset validation (trusted) -> result.
 */
export async function interpretWishes(provider: ProviderId, apiKey: string, model: string, text: string): Promise<ValidationResult> {
  const trimmed = text.trim().slice(0, MAX_INPUT_CHARS);
  if (!trimmed) throw new AiError("bad-output", "Describe your trip first.");
  // Load the provider SDKs on demand: visitors who never use the AI box never download them.
  const { callProvider } = await import("./providers");
  const raw = await callProvider(provider, apiKey.trim(), model.trim(), trimmed);
  try {
    return validateWishes(raw);
  } catch {
    throw new AiError("bad-output", "The model's answer didn't match the expected shape. Try again.");
  }
}
