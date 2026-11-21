import { env } from "@/config/env";
import { storage } from "@/lib/storage";

const types: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", ogg: "audio/ogg", mp3: "audio/mpeg" };

/** Serves files for the local storage driver (dev / self-hosted). In production media comes from R2. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (env.STORAGE_DRIVER !== "local") return new Response("Not found", { status: 404 });
  const { key } = await params;
  const k = key.join("/");
  if (k.includes("/audio/")) return new Response("Not found", { status: 404 }); // voice notes are private
  const buf = await storage.get(k).catch(() => null);
  if (!buf) return new Response("Not found", { status: 404 });
  const ext = k.split(".").pop() ?? "";
  const type = types[ext] ?? "application/octet-stream";
  const total = buf.byteLength;
  const range = req.headers.get("range");
  const headers = { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "Accept-Ranges": "bytes" };
  if (range && type.startsWith("video/")) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
    return new Response(new Uint8Array(buf.subarray(start, end + 1)), { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) } });
  }
  return new Response(new Uint8Array(buf), { headers: { ...headers, "Content-Length": String(total) } });
}
