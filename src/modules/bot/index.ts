import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { appUrl } from "@/config/env";
import { db } from "@/db";
import { agents, leads, visits, waMessages, type ListingStatus } from "@/db/schema";
import { id } from "@/lib/ids";
import { normalizePhone, waLink } from "@/lib/phone";
import { inr, istDayRange, priceLabel } from "@/lib/format";
import { parseAmount, parseSearchQuery } from "@/lib/ai/parse";
import { processAvatar } from "@/lib/images";
import { storage } from "@/lib/storage";
import { sendWhatsApp, type InboundMessage } from "@/lib/wa";
import { createLoginToken } from "@/lib/auth/session";
import { agentDisplayName, createAgent, getAgentByPhone, setBotContext } from "../agents";
import { getAccess } from "../billing";
import { addDraftMedia, addDraftText, discardDraft, draftCounts, finalizeDraft, getOrCreateDraft, openDraft, setDraftFields } from "../drafts";
import { applyCorrection, getListingByRef, getOwnListing, markVerified as markListingVerified, publishListing, searchListings, setListingPrice, setListingStatus, agentListings } from "../listings";
import { findOrCreateLead } from "../leads";
import { leadShare, listingUrl, collectionUrl, generalCollectionShare } from "../shares";
import { createCollection } from "../collections";
import { markVerified } from "../verify";
import { M } from "./messages";

type Agent = typeof agents.$inferSelect;

const YT_RE = /(https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]{6,}[^\s]*)/i;
const REF = "([A-Z0-9]{5})";

async function reply(to: string, text: string, agentId?: string | null) {
  await sendWhatsApp(to, text, agentId);
}

async function magicLink(agentId: string, next = "/app") {
  const t = await createLoginToken(agentId);
  return `${appUrl}/app/auth?t=${t}&next=${encodeURIComponent(next)}`;
}

/** Entry point for every inbound WhatsApp message from any provider. */
export async function handleInbound(msg: InboundMessage & { mediaRef?: string }, fetchMedia?: (ref: string) => Promise<{ data: Buffer; mime: string }>) {
  const from = normalizePhone(msg.from) ?? msg.from;
  const text = (msg.text ?? "").trim();
  const agent = await getAgentByPhone(from);

  if (msg.providerId) {
    const dup = await db.query.waMessages.findFirst({ where: and(eq(waMessages.providerId, msg.providerId), eq(waMessages.direction, "in")), columns: { id: true } });
    if (dup) return; // webhook retry
  }
  await db.insert(waMessages).values({ id: id(), direction: "in", phone: from, agentId: agent?.id, type: msg.type, text: text || null, providerId: msg.providerId, status: "received" });

  // 1. Verification codes (agent login / buyer verification) — works for anyone.
  if (/\b(LOGIN|VERIFY)\s+[A-Z0-9]{6}\b/i.test(text)) {
    const v = await markVerified(text, from);
    if (!v) return reply(from, M.verifyExpired(), agent?.id);
    if (v.purpose === "agent_login") {
      if (!agent) {
        const a = await createAgent(from, msg.pushName ?? "");
        await db.update(agents).set({ lastInboundAt: new Date() }).where(eq(agents.id, a.id));
        await reply(from, M.agentLoginOk(), a.id);
        return reply(from, M.welcomeNew(), a.id);
      }
      return reply(from, M.agentLoginOk(), agent.id);
    }
    const shareAgent = v.shareCode ? await db.query.shares.findFirst({ where: (s, { eq }) => eq(s.code, v.shareCode!) }) : null;
    const owner = shareAgent ? await db.query.agents.findFirst({ where: eq(agents.id, shareAgent.agentId) }) : null;
    return reply(from, M.buyerVerifiedOk(owner ? agentDisplayName(owner) : "The agent"));
  }

  if (/^stop$/i.test(text)) return reply(from, M.stop(), agent?.id);

  // 2. New sender → start onboarding (unless it's a buyer who verified via a property link).
  if (!agent) {
    const wasBuyer = await db.query.waVerifications.findFirst({ where: (v, { and, eq }) => and(eq(v.phone, from), eq(v.purpose, "buyer_verify")), columns: { code: true } });
    if (wasBuyer && !/^(join|signup|sign up|agent|register)$/i.test(text)) return reply(from, `${M.buyerUnknown()}\n\nAre you a property agent? Reply *JOIN* to create your free account.`);
    const a = await createAgent(from, "");
    await db.update(agents).set({ lastInboundAt: new Date() }).where(eq(agents.id, a.id));
    return reply(from, M.welcomeNew(), a.id);
  }
  await db.update(agents).set({ lastInboundAt: new Date() }).where(eq(agents.id, agent.id));
  if (agent.disabled) return;

  const loadMedia = async () => {
    if (msg.media?.data) return { data: msg.media.data, mime: msg.media.mime };
    if (msg.mediaRef && fetchMedia) return fetchMedia(msg.mediaRef);
    if (msg.media?.url) {
      const r = await fetch(msg.media.url, { signal: AbortSignal.timeout(60000) });
      return { data: Buffer.from(await r.arrayBuffer()), mime: msg.media.mime || r.headers.get("content-type") || "application/octet-stream" };
    }
    throw new Error("no media bytes");
  };

  // 3. Onboarding conversation.
  if (!agent.onboarded) return onboarding(agent, msg, text, loadMedia);

  // 4. Plan locked → only allow login/help.
  const access = await getAccess(agent.id);
  if (!access.canUse && !/^(login|link|dashboard|help|menu|renew|billing)$/i.test(text)) {
    return reply(from, M.locked(await magicLink(agent.id, "/app/settings/billing")), agent.id);
  }

  // 5. Media → current draft.
  const kind =
    msg.type === "image" || (msg.type === "document" && msg.media?.mime?.startsWith("image/"))
      ? "image"
      : msg.type === "video" || (msg.type === "document" && msg.media?.mime?.startsWith("video/"))
        ? "video"
        : msg.type === "audio"
          ? "audio"
          : msg.type === "document" && msg.media?.mime === "application/pdf"
            ? "doc"
            : null;
  if (kind) {
    const { draft, created } = await getOrCreateDraft(agent.id);
    try {
      const m = await loadMedia();
      await addDraftMedia(agent, draft.id, kind, m.data, m.mime, msg.media?.filename);
    } catch (e) {
      console.error("[bot] media failed", e);
      return reply(from, `⚠️ Couldn't save that ${kind}: ${(e as Error).message}`, agent.id);
    }
    if (text) await addDraftText(draft.id, text);
    if (created) await reply(from, M.firstMedia(), agent.id);
    return;
  }
  if (msg.type === "location" && msg.location) {
    const { draft, created } = await getOrCreateDraft(agent.id);
    await setDraftFields(draft.id, { location: msg.location });
    if (created) await reply(from, M.firstMedia(), agent.id);
    return;
  }
  if (msg.type === "contact" && msg.contact) {
    const phone = normalizePhone(msg.contact.phone);
    if (!phone) return reply(from, "⚠️ That contact has no valid phone number.", agent.id);
    const lead = await findOrCreateLead(agent.id, { name: msg.contact.name, phone, source: "bot" });
    const pending = (await getAgentByPhone(from))?.botContext.pendingShare;
    if (pending?.listingIds.length) {
      await setBotContext(agent.id, {});
      return shareTo(agent, pending.listingIds, lead);
    }
    return reply(from, M.contactAdded(lead.name || phone, `${appUrl}/app/leads/${lead.id}`), agent.id);
  }
  if (msg.type === "document") return reply(from, "📄 I can attach PDFs (floor plans, brochures), photos and videos. That file type isn't supported.", agent.id);
  if (!text) return;

  return command(agent, from, text);
}

async function onboarding(agent: Agent, msg: InboundMessage, text: string, loadMedia: () => Promise<{ data: Buffer; mime: string }>) {
  const step = agent.botContext.onboarding ?? "name";
  const from = agent.phone;
  const skip = /^(skip|no|na|-)$/i.test(text);
  if (step === "name") {
    const name = text.replace(/^(i am|i'm|my name is|this is|name:?)\s+/i, "").slice(0, 60).trim();
    if (!name || name.length < 2 || msg.type !== "text") return reply(from, "Please type your name 🙂", agent.id);
    const { uniqueHandle } = await import("../agents");
    await db.update(agents).set({ name, handle: await uniqueHandle(name, agent.id) }).where(eq(agents.id, agent.id));
    await setBotContext(agent.id, { onboarding: "company" });
    return reply(from, M.askCompany(name.split(" ")[0]), agent.id);
  }
  if (step === "company") {
    if (!skip && text) {
      const { uniqueHandle } = await import("../agents");
      await db.update(agents).set({ company: text.slice(0, 80), handle: await uniqueHandle(text, agent.id) }).where(eq(agents.id, agent.id));
    }
    await setBotContext(agent.id, { onboarding: "photo" });
    return reply(from, M.askPhoto(), agent.id);
  }
  if (step === "photo") {
    if (msg.type === "image") {
      try {
        const m = await loadMedia();
        const key = `a/${agent.id}/brand/photo-${id().slice(0, 6)}.webp`;
        const url = await storage.put(key, await processAvatar(m.data), "image/webp");
        await db.update(agents).set({ photoUrl: url }).where(eq(agents.id, agent.id));
      } catch (e) {
        console.error("[bot] avatar failed", e);
      }
    } else if (!skip) return reply(from, M.askPhoto(), agent.id);
    await setBotContext(agent.id, { onboarding: "promise" });
    return reply(from, M.promise(), agent.id);
  }
  // promise
  if (/^(yes|y|ok|okay|haan|ha|accept|agreed?|👍)$/i.test(text)) {
    await db.update(agents).set({ onboarded: true, promiseAcceptedAt: new Date(), botContext: {} }).where(eq(agents.id, agent.id));
    return reply(from, M.onboarded(await magicLink(agent.id)), agent.id);
  }
  return reply(from, M.promise(), agent.id);
}

const STATUS_WORDS: Record<string, ListingStatus> = { sold: "sold", rented: "rented", hold: "on_hold", available: "available", unhold: "available", live: "available" };
const STATUS_LABEL: Record<ListingStatus, string> = { draft: "Draft", available: "Available", on_hold: "On hold", sold: "Sold", rented: "Rented", archived: "Archived" };

async function command(agent: Agent, from: string, text: string) {
  const t = text.trim();
  const lower = t.toLowerCase();
  const ctx = agent.botContext;

  // Reply to the "1 / 2 / 3" draft question
  if (ctx.pendingListingId && /^[123]$|^(publish|edit|discard)$/i.test(t)) {
    const l = await getOwnListing(agent.id, ctx.pendingListingId);
    await setBotContext(agent.id, {});
    if (!l) return reply(from, M.unknown(), agent.id);
    if (t === "1" || /publish/i.test(t)) {
      const share = await publishListing(agent.id, l.id);
      return reply(from, M.published(l.title, listingUrl(share.code), l.ref), agent.id);
    }
    if (t === "2" || /edit/i.test(t)) return reply(from, M.editLink(await magicLink(agent.id, `/app/properties/${l.id}/edit`)), agent.id);
    await setListingStatus(agent.id, l.id, "archived");
    return reply(from, M.discarded(), agent.id);
  }

  // done / new — finish the current batch
  if (/^(done|ok done|finish|finished|bas|ho gaya|create|new)$/i.test(t)) {
    const d = await openDraft(agent.id);
    if (!d) return reply(from, /^new$/i.test(t) ? "Ready! Send the photos for the next property 📸" : M.nothingToFinish(), agent.id);
    const c = await draftCounts(d.id);
    if (!c.images && !c.videos && !d.texts.length && !d.audioKeys.length) return reply(from, M.nothingToFinish(), agent.id);
    await reply(from, M.processing(c.images, c.videos), agent.id);
    const r = await finalizeDraft(d.id, { force: true });
    if (r) await sendDraftReady(agent, r.listing.id, r.extracted.missing, r.unheardVoice);
    if (/^new$/i.test(t)) await reply(from, "Send the photos for the next property 📸", agent.id);
    return;
  }
  if (/^(cancel|discard)$/i.test(t)) {
    const d = await openDraft(agent.id);
    if (d) await discardDraft(d.id);
    return reply(from, M.discarded(), agent.id);
  }

  if (/^(login|link|dashboard|app)$/i.test(t)) return reply(from, M.login(await magicLink(agent.id)), agent.id);
  if (/^(renew|billing|pay|plan)$/i.test(t)) return reply(from, M.login(await magicLink(agent.id, "/app/settings/billing")), agent.id);
  if (/^(help|menu|hi|hello|hey|start|\?)$/i.test(t)) return reply(from, M.help(), agent.id);

  // yes REF (availability verification)
  let m = t.match(new RegExp(`^(?:yes|available|still available)\\s+${REF}$`, "i"));
  if (m && /^yes/i.test(t)) {
    const l = await getListingByRef(agent.id, m[1]);
    if (!l) return reply(from, M.notFound(m[1]), agent.id);
    await markListingVerified(agent.id, l.id);
    if (l.status !== "available") await setListingStatus(agent.id, l.id, "available");
    return reply(from, M.verifiedOk(l.title), agent.id);
  }

  // status: sold REF / rented REF / hold REF / available REF
  m = t.match(new RegExp(`^(sold|rented|hold|unhold|available|live)\\s+${REF}$`, "i"));
  if (m) {
    const l = await getListingByRef(agent.id, m[2]);
    if (!l) return reply(from, M.notFound(m[2]), agent.id);
    const st = STATUS_WORDS[m[1].toLowerCase()];
    if (l.status === "draft" && st === "available") await publishListing(agent.id, l.id);
    else await setListingStatus(agent.id, l.id, st);
    return reply(from, M.statusUpdated(l.title, STATUS_LABEL[st]), agent.id);
  }

  // publish REF
  m = t.match(new RegExp(`^publish\\s+${REF}$`, "i"));
  if (m) {
    const l = await getListingByRef(agent.id, m[1]);
    if (!l) return reply(from, M.notFound(m[1]), agent.id);
    const share = await publishListing(agent.id, l.id);
    return reply(from, M.published(l.title, listingUrl(share.code), l.ref), agent.id);
  }

  // price REF 92L
  m = t.match(new RegExp(`^price\\s+${REF}\\s+(.+)$`, "i"));
  if (m) {
    const l = await getListingByRef(agent.id, m[1]);
    if (!l) return reply(from, M.notFound(m[1]), agent.id);
    const amount = parseAmount(m[2].replace(/\s+/g, ""));
    if (!amount || amount < 1000) return reply(from, "Please write the price like *92L*, *1.2cr* or *25000*.", agent.id);
    await setListingPrice(agent.id, l.id, amount);
    return reply(from, M.priceUpdated(l.title, inr(amount)), agent.id);
  }

  // share REF [REF2 …] [to NAME PHONE]  — several refs become one shortlist link
  if (/^share\b/i.test(t)) {
    const body = t.replace(/^share\s*/i, "");
    const refs: string[] = [];
    let rest = body;
    for (;;) {
      const mm = rest.match(/^([A-Z0-9]{5})\b[\s,]*/i);
      if (!mm) break;
      refs.push(mm[1].toUpperCase());
      rest = rest.slice(mm[0].length);
    }
    if (!refs.length) return reply(from, M.shareUsage(), agent.id);
    const ls = [];
    for (const r of refs) {
      const l = await getListingByRef(agent.id, r);
      if (!l) return reply(from, M.notFound(r), agent.id);
      if (l.status === "draft") await publishListing(agent.id, l.id);
      ls.push(l);
    }
    rest = rest.replace(/^(to|with)\s+/i, "").trim();
    const phoneMatch = rest.match(/(\+?\d[\d\s-]{8,16}\d)/);
    const phone = normalizePhone(phoneMatch?.[1]);
    const name = rest.replace(phoneMatch?.[1] ?? "", "").replace(/[,:]/g, " ").trim().slice(0, 60);
    if (!name && !phone) {
      // No buyer given: remember, and offer the public link meanwhile.
      await setBotContext(agent.id, { pendingShare: { listingIds: ls.map((l) => l.id) } });
      const { generalListingShare } = await import("../shares");
      const pub = ls.length === 1 ? listingUrl((await generalListingShare(agent.id, ls[0].id)).code) : null;
      return reply(from, M.shareWho(pub), agent.id);
    }
    const lead = await findOrCreateLead(agent.id, { name, phone, source: "share" });
    return shareTo(agent, ls.map((l) => l.id), lead);
  }

  // Completing a pending share with "Name 98xxxxxxxx"
  if (ctx.pendingShare?.listingIds.length) {
    const phoneMatch = t.match(/(\+?\d[\d\s-]{8,16}\d)/);
    const phone = normalizePhone(phoneMatch?.[1]);
    if (phone) {
      const name = t.replace(phoneMatch![1], "").replace(/[,:]/g, " ").trim().slice(0, 60);
      await setBotContext(agent.id, {});
      const lead = await findOrCreateLead(agent.id, { name, phone, source: "share" });
      return shareTo(agent, ctx.pendingShare.listingIds, lead);
    }
  }

  if (/^(list|properties|inventory|my properties)$/i.test(t)) {
    const rows = (await agentListings(agent.id, { status: "active" })).slice(0, 15);
    if (!rows.length) return reply(from, "You have no live properties yet. Forward some photos to start!", agent.id);
    return reply(from, `📋 *Your live properties*\n\n${rows.map((r) => `*${r.l.ref}* · ${r.l.title} · ${priceLabel(r.l)} · 👁 ${r.views}`).join("\n")}\n\nDashboard: ${appUrl}/app/properties`, agent.id);
  }

  if (/^(leads|hot|buyers)$/i.test(t)) {
    const rows = await db.select().from(leads).where(eq(leads.agentId, agent.id)).orderBy(desc(leads.intentScore), desc(leads.lastActivityAt)).limit(8);
    if (!rows.length) return reply(from, "No leads yet. Share a property with *share REF to Name Number*.", agent.id);
    return reply(
      from,
      `🔥 *Your top buyers*\n\n${rows.map((r) => `${r.intentScore >= 45 ? "🔥" : r.intentScore >= 22 ? "⭐" : "•"} ${r.name || r.phone} — ${r.stage}`).join("\n")}\n\n${appUrl}/app/leads`,
      agent.id,
    );
  }

  if (/^(today|visits|aaj)$/i.test(t)) {
    const { start, end } = istDayRange();
    const vs = await db
      .select({ v: visits, name: leads.name })
      .from(visits)
      .leftJoin(leads, eq(leads.id, visits.leadId))
      .where(and(eq(visits.agentId, agent.id), inArray(visits.status, ["confirmed", "rescheduled"]), gte(visits.scheduledAt, start), lte(visits.scheduledAt, end)));
    const req = await db.select({ n: sql<number>`count(*)::int` }).from(visits).where(and(eq(visits.agentId, agent.id), eq(visits.status, "requested")));
    const fu = await db.select().from(leads).where(and(eq(leads.agentId, agent.id), isNotNull(leads.nextFollowUpAt), lte(leads.nextFollowUpAt, end)));
    const lines = [
      `📅 *Today*`,
      vs.length ? vs.map((v) => `• ${v.v.scheduledAt!.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} — ${v.name ?? "Buyer"}`).join("\n") : "No visits scheduled.",
      req[0]?.n ? `\n⏳ ${req[0].n} visit request${req[0].n > 1 ? "s" : ""} waiting for your confirmation` : "",
      fu.length ? `\n📞 Follow up: ${fu.map((f) => f.name || f.phone).join(", ")}` : "",
      `\n${appUrl}/app`,
    ];
    return reply(from, lines.filter(Boolean).join("\n"), agent.id);
  }

  // YouTube link → attach to current draft
  const yt = t.match(YT_RE);
  if (yt) {
    const { draft, created } = await getOrCreateDraft(agent.id);
    await setDraftFields(draft.id, { youtubeUrl: yt[1] });
    const rest = t.replace(yt[1], "").trim();
    if (rest) await addDraftText(draft.id, rest);
    if (created) await reply(from, M.firstMedia(), agent.id);
    return;
  }

  // Search: explicit "find …" or a query with budget words
  const d = await openDraft(agent.id);
  const isSearch = /^(find|search|show|need|looking for|any|get)\b/i.test(t) || (!d && /\b(under|below|upto|within|budget)\b/i.test(t));
  if (isSearch) return search(agent, from, t.replace(/^(find|search|show|need|looking for|any|get)\s*/i, ""));

  // Corrections to the draft just created ("95 lakh, Gotri") — no need to open the editor.
  const pendingDraft = ctx.pendingListingId ? await getOwnListing(agent.id, ctx.pendingListingId) : null;
  if (!d && pendingDraft?.status === "draft" && t.split(/\s+/).length <= 10) {
    const changed = await applyCorrection(agent.id, pendingDraft.id, t);
    if (changed.length) {
      const l = await getOwnListing(agent.id, pendingDraft.id);
      if (l) return sendDraftReady(agent, l.id, l.missing, false, changed);
    }
  }

  // Otherwise: property details text → draft
  if (d) return addDraftText(d.id, t);
  const looksLikeProperty = /\b(\d\s*bhk|bhk|flat|apartment|villa|bungalow|plot|shop|office|sq\.?\s*ft|sqft|lakh|lac|cr|crore|rent|sale|furnished)\b/i.test(t);
  if (looksLikeProperty) {
    const { draft } = await getOrCreateDraft(agent.id);
    await addDraftText(draft.id, t);
    return reply(from, M.textDraftStarted(), agent.id);
  }
  return reply(from, M.unknown(), agent.id);
}

async function search(agent: Agent, from: string, q: string) {
  const query = parseSearchQuery(q);
  const rows = await searchListings(agent.id, query, 10);
  if (!rows.length) return reply(from, M.searchNone(), agent.id);
  let url: string | null = null;
  if (rows.length > 1) {
    const c = await createCollection(agent.id, { title: `Properties for you`, listingIds: rows.map((r) => r.l.id) });
    url = collectionUrl((await generalCollectionShare(agent.id, c.id)).code);
  }
  const lines = await Promise.all(
    rows.map(async (r) => {
      const { generalListingShare } = await import("../shares");
      const s = await generalListingShare(agent.id, r.l.id);
      return `*${r.l.ref}* · ${r.l.title} · ${priceLabel(r.l)}\n${listingUrl(s.code)}`;
    }),
  );
  return reply(from, M.searchResults(lines, url), agent.id);
}

export async function sendDraftReady(agent: Agent, listingId: string, missing: string[], unheardVoice: boolean, updated?: string[]) {
  const l = await getOwnListing(agent.id, listingId);
  if (!l) return;
  await setBotContext(agent.id, { pendingListingId: l.id });
  const preview = await magicLink(agent.id, `/app/properties/${l.id}`);
  await reply(agent.phone, M.draftReady(l.title, priceLabel(l), l.ref, preview, missing, unheardVoice, updated), agent.id);
}

/** Personal link (1 property) or shortlist link (2+ properties) for one buyer. */
async function shareTo(agent: Agent, listingIds: string[], lead: { id: string; name: string; phone: string | null }) {
  const first = (lead.name || "there").split(" ")[0];
  let url: string;
  let msgText: string;
  if (listingIds.length === 1) {
    const l = (await getOwnListing(agent.id, listingIds[0]))!;
    url = listingUrl((await leadShare(agent.id, { listingId: l.id }, lead.id)).code);
    msgText = `Hi ${first}! Sharing the details of ${l.title} — photos, price and location here:\n${url}`;
  } else {
    const c = await createCollection(agent.id, { title: `Properties selected for ${first}`, listingIds, leadId: lead.id });
    url = collectionUrl((await leadShare(agent.id, { collectionId: c.id }, lead.id)).code);
    msgText = `Hi ${first}! I've shortlisted ${listingIds.length} properties for you. Like the ones you prefer and I'll arrange visits:\n${url}`;
  }
  const who = lead.name || (lead.phone ? `+${lead.phone}` : "your buyer");
  return reply(agent.phone, M.shareReady(who, url, lead.phone ? waLink(lead.phone, msgText) : `https://wa.me/?text=${encodeURIComponent(msgText)}`), agent.id);
}
