/**
 * Provider metadata and the error type, kept apart from the SDK adapters so the UI
 * can import them without pulling the three provider SDKs into the page bundle.
 * The SDKs load only when the user actually asks the AI (see interpret.ts).
 */
export type ProviderId = "anthropic" | "openai" | "gemini";

export const PROVIDERS: Record<ProviderId, { label: string; defaultModel: string; keyPrefix: string; keyUrl: string }> = {
  anthropic: { label: "Anthropic (Claude)", defaultModel: "claude-opus-5-5", keyPrefix: "sk-ant-", keyUrl: "https://platform.claude.com/settings/keys" },
  openai: { label: "OpenAI", defaultModel: "gpt-6-astra", keyPrefix: "sk-", keyUrl: "https://platform.openai.com/api-keys" },
  gemini: { label: "Google Gemini", defaultModel: "gemini-4-carbon", keyPrefix: "", keyUrl: "https://aistudio.google.com/apikey" },
};

/** A failure the UI can explain in plain words. */
export class AiError extends Error {
  constructor(
    public kind: "auth" | "rate-limit" | "network" | "refused" | "truncated" | "bad-output" | "provider",
    message: string,
  ) {
    super(message);
  }
}

