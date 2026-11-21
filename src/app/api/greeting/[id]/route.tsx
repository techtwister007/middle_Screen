import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { storage } from "@/lib/storage";
import { currentAgent } from "@/lib/auth/session";
import { brand } from "@/config/brand";
import { festivalById, type Motif } from "@/lib/festivals";
import { agentDisplayName } from "@/modules/agents";

export const runtime = "nodejs";

const GOLD = "#f3c768";

/** Simple, flat festival marks drawn in SVG (the image renderer has no emoji font). */
function MotifArt({ motif, color }: { motif: Motif; color: string }) {
  const s = { width: 340, height: 340 };
  switch (motif) {
    case "diya":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <path d="M100 30c18 26 22 44 0 70-22-26-18-44 0-70z" fill={GOLD} />
          <path d="M100 52c8 12 9 22 0 34-9-12-8-22 0-34z" fill="#fff6dc" />
          <path d="M30 112h140c-6 34-34 54-70 54s-64-20-70-54z" fill="#fff" />
          <path d="M44 124h112" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray="2 14" />
        </svg>
      );
    case "colours":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <circle cx="70" cy="80" r="44" fill="#ff5fa2" />
          <circle cx="130" cy="72" r="34" fill="#ffd23f" />
          <circle cx="124" cy="132" r="42" fill="#3ec5f0" />
          <circle cx="62" cy="146" r="26" fill="#ff9f1c" />
          <circle cx="160" cy="150" r="14" fill="#9b6bff" />
          <circle cx="36" cy="40" r="10" fill="#fff" />
        </svg>
      );
    case "kite":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <path d="M92 18l52 58-52 58-52-58z" fill={GOLD} />
          <path d="M92 18v116M40 76h104" stroke={color} strokeWidth="4" />
          <path d="M92 134c-6 18 10 26 2 42s8 22 4 24" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M86 156l12 6-12 6zM92 178l12 6-12 6z" fill="#fff" />
          <path d="M156 92l24 26-24 26-24-26z" fill="#fff" />
        </svg>
      );
    case "garba":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <circle cx="100" cy="100" r="86" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="4 12" strokeLinecap="round" />
          <circle cx="100" cy="100" r="62" fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="10 10" />
          <path d="M58 150L142 50M58 50l84 100" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
          <path d="M58 150l10-12M142 150l-10-12M58 50l10 12M142 50l-10 12" stroke={GOLD} strokeWidth="12" strokeLinecap="round" />
        </svg>
      );
    case "crescent":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <circle cx="92" cy="100" r="72" fill={GOLD} />
          <circle cx="122" cy="84" r="64" fill={color} />
          <path d="M150 112l7 16 17 2-13 11 4 17-15-9-15 9 4-17-13-11 17-2z" fill="#fff" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <path d="M100 20l22 52 56 4-43 36 14 54-49-30-49 30 14-54-43-36 56-4z" fill={GOLD} />
          <circle cx="32" cy="40" r="6" fill="#fff" />
          <circle cx="170" cy="164" r="8" fill="#fff" />
          <circle cx="176" cy="40" r="4" fill="#fff" />
        </svg>
      );
    case "sparkle":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <path d="M100 14c6 52 34 80 86 86-52 6-80 34-86 86-6-52-34-80-86-86 52-6 80-34 86-86z" fill={GOLD} />
          <path d="M160 20c2 16 10 24 26 26-16 2-24 10-26 26-2-16-10-24-26-26 16-2 24-10 26-26z" fill="#fff" />
          <path d="M40 140c2 14 8 20 22 22-14 2-20 8-22 22-2-14-8-20-22-22 14-2 20-8 22-22z" fill="#fff" />
        </svg>
      );
    case "tricolour":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <rect x="20" y="46" width="160" height="36" rx="10" fill="#ff9933" />
          <rect x="20" y="82" width="160" height="36" fill="#ffffff" />
          <rect x="20" y="118" width="160" height="36" rx="10" fill="#138808" />
          <circle cx="100" cy="100" r="15" fill="none" stroke="#000080" strokeWidth="3" />
          <circle cx="100" cy="100" r="3" fill="#000080" />
        </svg>
      );
    case "flower":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          {Array.from({ length: 10 }, (_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return <circle key={i} cx={100 + Math.cos(a) * 52} cy={100 + Math.sin(a) * 52} r="30" fill={i % 2 ? "#ff9f1c" : GOLD} />;
          })}
          <circle cx="100" cy="100" r="34" fill="#fff" />
          <circle cx="100" cy="100" r="16" fill="#ff9f1c" />
        </svg>
      );
    case "coins":
      return (
        <svg viewBox="0 0 200 200" {...s}>
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse key={i} cx="80" cy={164 - i * 18} rx="56" ry="18" fill={i % 2 ? "#e6b54d" : GOLD} stroke={color} strokeWidth="3" />
          ))}
          <circle cx="146" cy="78" r="40" fill={GOLD} stroke="#fff" strokeWidth="5" />
          <path d="M132 64h28M132 76h28M140 64c16 0 16 26 0 26l20 22" stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 200 200" {...s}>
          <path d="M30 96L100 34l70 62v74H124v-48H76v48H30z" fill="#fff" />
          <rect x="84" y="128" width="32" height="42" fill={GOLD} />
          <circle cx="160" cy="40" r="10" fill={GOLD} />
        </svg>
      );
  }
}

/** A 1080×1350 greeting card (WhatsApp Status and posts) in the agent's colour, with their name and number. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = await currentAgent();
  if (!agent) return new Response("Unauthorized", { status: 401 });
  const f = festivalById((await params).id);
  if (!f) return new Response("Not found", { status: 404 });
  const msg = new URL(req.url).searchParams.get("msg")?.trim().slice(0, 140) || f.line;
  const [regular, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "src/assets/fonts/DMSans-400.ttf")),
    readFile(path.join(process.cwd(), "src/assets/fonts/DMSans-700.ttf")),
  ]);
  const color = agent.brandColor || "#1f4d36";
  const name = agentDisplayName(agent);
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  // Agent photo or logo, converted to JPEG for the renderer; falls back to initials.
  let photo: string | null = null;
  const src = agent.logoUrl || agent.photoUrl;
  const at = src?.indexOf(`a/${agent.id}/`) ?? -1;
  if (src && at >= 0) {
    try {
      const buf = await storage.get(decodeURIComponent(src.slice(at).split("?")[0]));
      photo = `data:image/jpeg;base64,${(await sharp(buf).resize(160, 160, { fit: "cover" }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer()).toString("base64")}`;
    } catch {
      photo = null;
    }
  }
  const sub = [agent.company && agent.name ? agent.name : null, `+${agent.phone.replace(/^91(\d{10})$/, "91 $1")}`].filter(Boolean).join(" · ");

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1350, display: "flex", flexDirection: "column", alignItems: "center", background: color, fontFamily: "DM Sans", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 900, height: 900, borderRadius: 999, background: "rgba(255,255,255,0.06)", left: -260, top: -320 }} />
        <div style={{ position: "absolute", width: 640, height: 640, borderRadius: 999, background: "rgba(255,255,255,0.05)", right: -220, top: 520 }} />
        <div style={{ marginTop: 170, display: "flex" }}>
          <MotifArt motif={f.motif} color={color} />
        </div>
        <div style={{ marginTop: 56, fontSize: 96, fontWeight: 700, color: "#fff", letterSpacing: -2, textAlign: "center", lineHeight: 1.02, maxWidth: 940, display: "flex", justifyContent: "center" }}>{f.title}</div>
        <div style={{ marginTop: 28, fontSize: 40, color: "rgba(255,255,255,0.88)", textAlign: "center", lineHeight: 1.3, maxWidth: 840, display: "flex", justifyContent: "center" }}>{msg}</div>
        <div style={{ position: "absolute", left: 56, right: 56, bottom: 92, height: 200, borderRadius: 40, background: "#ffffff", display: "flex", alignItems: "center", padding: "0 40px", gap: 30 }}>
          {photo ? (
            <img src={photo} width={120} height={120} style={{ borderRadius: 999 }} />
          ) : (
            <div style={{ width: 120, height: 120, borderRadius: 999, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46, fontWeight: 700 }}>{initials}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 26, color: "#66716a" }}>Warm wishes from</div>
            <div style={{ fontSize: 46, fontWeight: 700, color: "#1c2620", letterSpacing: -0.5 }}>{name}</div>
            <div style={{ fontSize: 28, color: "#66716a" }}>{sub}</div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 34, fontSize: 22, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 8 }}>
          with
          <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill="#ff6b7a" /></svg>
          from {brand.name}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "DM Sans", data: regular, weight: 400, style: "normal" },
        { name: "DM Sans", data: bold, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "private, max-age=600" },
    },
  );
}
