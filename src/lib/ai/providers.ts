/**
 * Bring-your-own-key LLM adapters. Every call goes from the user's browser
 * straight to the provider: this app's server never sees the key.
 *
 * Each adapter takes the same inputs and returns raw JSON (unknown); the caller
 * validates it with `validateWishes`, so no adapter's output is trusted.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { z } from "zod";
import { AiError, type ProviderId } from "./meta";
import { SYSTEM_PROMPT, WishesSchema } from "./schema";

/** JSON Schema for providers that take a plain schema (OpenAI strict mode needs additionalProperties: false everywhere). */
function strictJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(WishesSchema) as Record<string, unknown>;
  delete schema.$schema;
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.type === "object") n.additionalProperties = false;
    Object.values(n).forEach((v) => (Array.isArray(v) ? v.forEach(walk) : walk(v)));
  };
  walk(schema);
  return schema;
}

// ---------------------------------------------------------------- Anthropic

/** Models that accept the server-side refusal fallback and `effort`. Others get a plain request. */
const ANTHROPIC_FALLBACK_MODELS = new Set(["claude-fable-5-2", "claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);
const ANTHROPIC_EFFORT = /^claude-(opus|sonnet|haiku|fable|mythos)-5/;

async function callAnthropic(apiKey: string, model: string, text: string): Promise<unknown> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
  try {
    const res = await client.beta.messages.parse({
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
      output_config: {
        format: betaZodOutputFormat(WishesSchema),
        // Simple extraction: low effort is enough and keeps it fast.
        ...(ANTHROPIC_EFFORT.test(model) ? { effort: "low" as const } : {}),
      },
      // If the model declines, the API retries on a fallback model inside the same call.
      ...(ANTHROPIC_FALLBACK_MODELS.has(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    if (res.stop_reason === "refusal") throw new AiError("refused", "The model declined this request. Try rephrasing.");
    if (res.stop_reason === "max_tokens") throw new AiError("truncated", "The answer was cut off. Try a shorter description.");
    if (!res.parsed_output) throw new AiError("bad-output", "The model's answer wasn't in the expected format.");
    return res.parsed_output;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiError("auth", "Anthropic rejected this key.");
    if (e instanceof Anthropic.RateLimitError) throw new AiError("rate-limit", "Anthropic rate limit reached. Wait a moment and try again.");
    if (e instanceof Anthropic.APIConnectionError) throw new AiError("network", "Couldn't reach Anthropic. Check your connection.");
    if (e instanceof Anthropic.APIError) throw new AiError("provider", `Anthropic error ${e.status}: ${e.message}`);
    throw e;
  }
}

// ---------------------------------------------------------------- OpenAI

async function callOpenAI(apiKey: string, model: string, text: string): Promise<unknown> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
  try {
    const res = await client.responses.create({
      model,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      text: { format: { type: "json_schema", name: "trip_wishes", strict: true, schema: strictJsonSchema() } },
    });
    if (res.status === "incomplete") throw new AiError("truncated", "The answer was cut off. Try a shorter description.");
    const refused = res.output.some((o) => o.type === "message" && o.content.some((c) => c.type === "refusal"));
    if (refused) throw new AiError("refused", "The model declined this request. Try rephrasing.");
    return parseJson(res.output_text);
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof OpenAI.AuthenticationError) throw new AiError("auth", "OpenAI rejected this key.");
    if (e instanceof OpenAI.RateLimitError) throw new AiError("rate-limit", "OpenAI rate limit reached. Wait a moment and try again.");
    if (e instanceof OpenAI.APIConnectionError) throw new AiError("network", "Couldn't reach OpenAI. Check your connection.");
    if (e instanceof OpenAI.APIError) throw new AiError("provider", `OpenAI error ${e.status}: ${e.message}`);
    throw e;
  }
}

// ---------------------------------------------------------------- Gemini

async function callGemini(apiKey: string, model: string, text: string): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const interaction = await ai.interactions.create({
      model,
      system_instruction: SYSTEM_PROMPT,
      input: text,
      response_format: { type: "text", mime_type: "application/json", schema: strictJsonSchema() },
    });
    if (!interaction.output_text) throw new AiError("bad-output", "Gemini returned no text.");
    return parseJson(interaction.output_text);
  } catch (e) {
    if (e instanceof AiError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    // The GenAI SDK reports HTTP status in the message; map the common ones.
    if (/\b(401|403)\b|API key not valid|PERMISSION_DENIED/i.test(msg)) throw new AiError("auth", "Google rejected this key.");
    if (/\b429\b|RESOURCE_EXHAUSTED/i.test(msg)) throw new AiError("rate-limit", "Gemini rate limit reached. Wait a moment and try again.");
    if (/Failed to fetch|NetworkError/i.test(msg)) throw new AiError("network", "Couldn't reach Google. Check your connection.");
    throw new AiError("provider", `Gemini error: ${msg}`);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError("bad-output", "The model's answer wasn't valid JSON.");
  }
}

const ADAPTERS: Record<ProviderId, (apiKey: string, model: string, text: string) => Promise<unknown>> = {
  anthropic: callAnthropic,
  openai: callOpenAI,
  gemini: callGemini,
};

export function callProvider(provider: ProviderId, apiKey: string, model: string, text: string): Promise<unknown> {
  return ADAPTERS[provider](apiKey, model, text);
}
