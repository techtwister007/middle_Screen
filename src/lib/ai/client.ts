import "server-only";
import { env } from "@/config/env";

/** Thin client for any OpenAI-compatible API (Groq, Gemini, OpenRouter, OpenAI…). */
export const aiEnabled = () => !!env.AI_API_KEY;

export async function chatJson<T = unknown>(system: string, user: string, timeoutMs = 25000): Promise<T> {
  const res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.AI_API_KEY}` },
    body: JSON.stringify({
      model: env.AI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content.replace(/^```(?:json)?|```$/g, "").trim()) as T;
}

export async function transcribe(audio: Buffer, mime = "audio/ogg"): Promise<string> {
  if (!aiEnabled()) return "";
  const ext = mime.includes("mpeg") ? "mp3" : mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("wav") ? "wav" : "ogg";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)], { type: mime }), `voice.${ext}`);
  form.append("model", env.AI_TRANSCRIBE_MODEL);
  form.append("response_format", "json");
  const res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.AI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Transcribe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { text?: string }).text?.trim() ?? "";
}
