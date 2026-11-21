import { afterEach, describe, expect, it, vi } from "vitest";
import { interpretWishes } from "./interpret";
import { AiError } from "./meta";
import { validateWishes, SYSTEM_PROMPT } from "./schema";

const good = {
  interests: ["wine", "art"],
  priorities: ["hidden", "budget"],
  pace: "relaxed",
  maxPrice: "€€",
  mustSee: ["place_032", "place_999", "place_032"],
  cities: ["Florence"],
  summary: "Relaxed wine-and-art trip in Florence, avoiding crowds, with the David.",
};

describe("validateWishes (trust boundary)", () => {
  it("keeps valid fields and drops ids that are not in the dataset", () => {
    const { wishes, droppedIds } = validateWishes(good);
    expect(wishes.mustSee).toEqual(["place_032"]); // deduped, unknown removed
    expect(droppedIds).toEqual(["place_999"]);
    expect(wishes.maxPrice).toBe(2);
    expect(wishes.pace).toBe("relaxed");
  });

  it("completes the priority order: stated first, the rest in default order", () => {
    const { wishes } = validateWishes(good);
    expect(wishes.priorities).toEqual(["hidden", "budget", "interests", "rating", "walking"]);
  });

  it("rejects output with the wrong shape", () => {
    expect(() => validateWishes({ ...good, interests: ["skydiving"] })).toThrow();
    expect(() => validateWishes({ ...good, pace: "fast" })).toThrow();
    expect(() => validateWishes("not an object")).toThrow();
  });

  it("never lets the excluded place into the catalog the model sees", () => {
    expect(SYSTEM_PROMPT).not.toContain("place_025"); // Hard Rock Cafe, rated 2.1
    expect(SYSTEM_PROMPT).toContain("place_032 | Accademia Gallery");
  });
});

/** Capture every outgoing request; answer with a canned provider response. */
function mockFetch(body: unknown) {
  const calls: { url: string; headers: Headers; body: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init);
      calls.push({ url: req.url, headers: req.headers, body: await req.text() });
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

const KEY = "test-key-123";
const json = JSON.stringify(good);

describe("provider adapters: the key goes only to the provider", () => {
  it("Anthropic: one request to api.anthropic.com, key in the Authorization header, structured output", async () => {
    const calls = mockFetch({
      id: "msg_1",
      type: "message",
      role: "assistant",
      model: "claude-opus-5-5",
      content: [{ type: "text", text: json }],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 10 },
    });
    const { wishes } = await interpretWishes("anthropic", KEY, "claude-opus-5-5", "wine, art, the David");
    expect(wishes.mustSee).toEqual(["place_032"]);
    expect(calls).toHaveLength(1);
    expect(new URL(calls[0].url).host).toBe("api.anthropic.com");
    // SDK 1.x (API version 2026-10-21) sends the key as a Bearer token.
    expect(calls[0].headers.get("authorization")).toBe(`Bearer ${KEY}`);
    expect(calls[0].headers.get("anthropic-dangerous-direct-browser-access")).toBe("true");
    const sent = JSON.parse(calls[0].body);
    expect(sent.output_config.format.type).toBe("json_schema");
    expect(sent.fallbacks).toBe("default");
    expect(calls[0].body).not.toContain(KEY); // key never in the body
  });

  it("Anthropic: a refusal becomes a readable error", async () => {
    mockFetch({
      id: "msg_2", type: "message", role: "assistant", model: "claude-opus-5-5",
      content: [], stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 0 },
    });
    await expect(interpretWishes("anthropic", KEY, "claude-opus-5-5", "x")).rejects.toMatchObject({ kind: "refused" });
  });

  it("OpenAI: one request to api.openai.com, key as Bearer token, strict JSON schema", async () => {
    const calls = mockFetch({
      id: "resp_1",
      object: "response",
      status: "completed",
      output: [{ type: "message", id: "m1", role: "assistant", status: "completed", content: [{ type: "output_text", text: json, annotations: [] }] }],
    });
    const { wishes } = await interpretWishes("openai", KEY, "gpt-6-astra", "wine, art, the David");
    expect(wishes.interests).toEqual(["wine", "art"]);
    expect(new URL(calls[0].url).host).toBe("api.openai.com");
    expect(calls[0].headers.get("authorization")).toBe(`Bearer ${KEY}`);
    const sent = JSON.parse(calls[0].body);
    expect(sent.text.format).toMatchObject({ type: "json_schema", strict: true });
    expect(sent.text.format.schema.additionalProperties).toBe(false);
  });

  it("Gemini: one request to generativelanguage.googleapis.com, key in x-goog-api-key", async () => {
    const calls = mockFetch({ id: "int_1", steps: [{ type: "model_output", content: [{ type: "text", text: json }] }] });
    const { wishes } = await interpretWishes("gemini", KEY, "gemini-4-carbon", "wine, art, the David");
    expect(wishes.cities).toEqual(["Florence"]);
    expect(new URL(calls[0].url).host).toBe("generativelanguage.googleapis.com");
    expect(calls[0].headers.get("x-goog-api-key")).toBe(KEY);
    expect(new URL(calls[0].url).search).not.toContain(KEY); // not in the URL either
  });

  it("invalid JSON from a provider is a bad-output error, not a crash", async () => {
    mockFetch({ id: "int_2", steps: [{ type: "model_output", content: [{ type: "text", text: "not json" }] }] });
    const err = await interpretWishes("gemini", KEY, "gemini-4-carbon", "x").catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.kind).toBe("bad-output");
  });

  it("refuses empty input without calling any provider", async () => {
    const calls = mockFetch({});
    await expect(interpretWishes("openai", KEY, "gpt-6-astra", "   ")).rejects.toBeInstanceOf(AiError);
    expect(calls).toHaveLength(0);
  });
});
