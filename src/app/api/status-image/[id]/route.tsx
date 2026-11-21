import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { storage } from "@/lib/storage";
import { currentAgent } from "@/lib/auth/session";
import { appUrl } from "@/config/env";
import { brand } from "@/config/brand";
import { keySpecs, priceLabel, typeLabels } from "@/lib/format";
import { getListingWithProperty } from "@/modules/listings";
import { listingMedia } from "@/modules/media";
import { generalListingShare } from "@/modules/shares";
import { agentDisplayName } from "@/modules/agents";

export const runtime = "nodejs";

/** A 1080×1920 WhatsApp Status image for one of the agent's listings, in the agent's colour. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = await currentAgent();
  if (!agent) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const r = await getListingWithProperty(id);
  if (!r || r.l.agentId !== agent.id) return new Response("Not found", { status: 404 });
  const { l, p } = r;
  const [ms, share, regular, bold] = await Promise.all([
    listingMedia(id),
    generalListingShare(agent.id, id),
    readFile(path.join(process.cwd(), "src/assets/fonts/DMSans-400.ttf")),
    readFile(path.join(process.cwd(), "src/assets/fonts/DMSans-700.ttf")),
  ]);
  const img = ms.find((m) => m.kind === "image");
  // The image renderer can't read WebP, so the cover is converted to a JPEG data URI here.
  let photo: string | null = null;
  if (img) {
    try {
      const src = await storage.get(`${img.key}-lg.webp`);
      const jpg = await sharp(src).resize(1080, 1180, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
      photo = `data:image/jpeg;base64,${jpg.toString("base64")}`;
    } catch {
      photo = null;
    }
  }
  const color = agent.brandColor || "#1f4d36";
  const name = agentDisplayName(agent);
  const specs = keySpecs(p.type, l.fields ?? {}).slice(0, 3).map((s) => s.value);
  const place = [p.locality, p.city].filter(Boolean).join(", ");
  const link = `${appUrl.replace(/^https?:\/\//, "")}/p/${share.code}`;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", background: "#f6f2ea", fontFamily: "DM Sans" }}>
        <div style={{ position: "relative", width: 1080, height: 1180, display: "flex", background: color }}>
          {photo ? <img src={photo} width={1080} height={1180} style={{ objectFit: "cover" }} /> : null}
          <div style={{ position: "absolute", left: 56, top: 64, display: "flex", alignItems: "center", gap: 18, background: "rgba(255,255,255,0.95)", borderRadius: 999, padding: "12px 30px 12px 12px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 999, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 }}>{initials}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#1c2620" }}>{name}</div>
          </div>
          <div style={{ position: "absolute", right: 56, top: 72, background: color, color: "#fff", borderRadius: 999, padding: "12px 28px", fontSize: 30, fontWeight: 700 }}>{l.purpose === "rent" ? "For rent" : "For sale"}</div>
        </div>
        <div style={{ margin: "-90px 40px 0", background: "#fff", borderRadius: 48, padding: "56px 56px 48px", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(28,38,32,0.18)" }}>
          <div style={{ fontSize: 96, fontWeight: 700, color, letterSpacing: -2, lineHeight: 1 }}>{priceLabel(l)}</div>
          <div style={{ marginTop: 22, fontSize: 46, fontWeight: 700, color: "#1c2620", lineHeight: 1.15 }}>{l.title || `${typeLabels[p.type]} in ${p.locality ?? ""}`}</div>
          {place ? <div style={{ marginTop: 12, fontSize: 34, color: "#535d57" }}>{place}</div> : null}
          <div style={{ marginTop: 34, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {specs.map((s) => (
              <div key={s} style={{ fontSize: 30, fontWeight: 700, color: "#1c2620", background: "#eee9df", borderRadius: 999, padding: "14px 26px" }}>{s}</div>
            ))}
          </div>
        </div>
        <div style={{ margin: "auto 40px 0", display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 72 }}>
          <div style={{ fontSize: 34, color: "#535d57" }}>Photos, price & visit booking</div>
          <div style={{ marginTop: 10, fontSize: 44, fontWeight: 700, color }}>{link}</div>
          <div style={{ marginTop: 34, fontSize: 24, color: "#8a918c", display: "flex", alignItems: "center", gap: 8 }}>
            with
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.1C.8 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3 1.7-1.8 3.2-3 5.3-3 3.7 0 5.9 3.9 4.3 7.4C19.5 16.4 12 21 12 21Z" fill="#e0314b" /></svg>
            from {brand.name}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: "DM Sans", data: regular, weight: 400, style: "normal" },
        { name: "DM Sans", data: bold, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "private, max-age=60", "Content-Disposition": `inline; filename="${l.ref}-status.png"` },
    },
  );
}
