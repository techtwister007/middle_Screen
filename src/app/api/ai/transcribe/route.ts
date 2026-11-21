import { currentAgent } from "@/lib/auth/session";
import { bad, json } from "@/lib/http";
import { aiEnabled, transcribe } from "@/lib/ai/client";

/** Voice dictation in the web editor → text (Hindi/Gujarati/English supported by Whisper). */
export async function POST(req: Request) {
  const agent = await currentAgent();
  if (!agent) return bad("unauthorized", 401);
  if (!aiEnabled()) return bad("Voice typing needs an AI key (AI_API_KEY). Please type the details instead.", 501);
  const fd = await req.formData().catch(() => null);
  const file = fd?.get("file");
  if (!(file instanceof File) || file.size > 20 * 1024 * 1024) return bad("no audio");
  try {
    const text = await transcribe(Buffer.from(await file.arrayBuffer()), file.type || "audio/webm");
    return json({ ok: true, text });
  } catch (e) {
    return bad((e as Error).message);
  }
}
