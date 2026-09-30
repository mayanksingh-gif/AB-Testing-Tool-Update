// Thin adapter around a local, OpenAI-compatible chat-completions server
// (confirmed live in dev: mlx_lm serving Qwen3-4B at http://127.0.0.1:8080/v1).
// Base URL/model are env-driven so this never hardcodes one local port as the
// only option — anyone can point it at a different local server or model.
// Never throws: callers get a discriminated result and render an inline
// error instead of crashing the results page when the local server is down.

const DEFAULT_BASE_URL = "http://127.0.0.1:8080/v1";
const DEFAULT_MODEL = "mlx-community/Qwen3-4B-Instruct-2507-4bit";

export type LlmResult = { ok: true; content: string } | { ok: false; error: string };

export async function callLocalLLM(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<LlmResult> {
  const baseUrl = (process.env.LOCAL_LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.LOCAL_LLM_MODEL || DEFAULT_MODEL;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        temperature: 0.2,
        // The insights JSON schema (several finding groups + recommendations)
        // routinely exceeds a small model server's default completion cap,
        // which truncates mid-JSON and makes parseAiResponse legitimately
        // fail. Request a generous budget explicitly rather than relying on
        // whatever default the local server ships with.
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, error: `Local AI server responded with status ${res.status}.` };
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return { ok: false, error: "Local AI server returned an empty response." };
    }
    return { ok: true, content };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Local AI server timed out."
        : "Could not reach the local AI server. Make sure it's running.";
    return { ok: false, error: message };
  }
}
