import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { ExternalLink, Pencil, Eye, Users, Heart, CalendarCheck, Share2, AlertTriangle, Sparkles } from "lucide-react";
import { db } from "@/db";
import { buyerActions, events, leads, shares } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { priceLabel, timeAgo, keySpecs } from "@/lib/format";
import { env } from "@/config/env";
import { getListingWithProperty } from "@/modules/listings";
import { listingMedia } from "@/modules/media";
import { listingUrl } from "@/modules/shares";
import { matchingLeadsForListing } from "@/modules/matching";
import { leadOptions } from "@/modules/lead-options";
import { Badge, Card, LinkButton, PageHeader, Stat } from "@/components/ui";
import { ShareButton } from "@/components/app/ShareDialog";
import { statusText, statusTone } from "@/components/app/status";
import { StatusControls, VerifyBanner, PublishButton } from "./controls";

export default async function PropertyDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ verify?: string; share?: string }> }) {
  const agent = await requireAgent();
  const { id } = await params;
  const sp = await searchParams;
  const row = await getListingWithProperty(id);
  if (!row || row.l.agentId !== agent.id) notFound();
  const { l, p } = row;
  const [ms, opts, matches, general] = await Promise.all([
    listingMedia(id),
    leadOptions(agent.id),
    matchingLeadsForListing(id),
    db.query.shares.findFirst({ where: and(eq(shares.listingId, id), eq(shares.channel, "general")) }),
  ]);
  const [stats] = await db
    .select({
      views: sql<number>`count(*) filter (where ${events.type} = 'open')::int`,
      viewers: sql<number>`count(distinct ${events.sessionId}) filter (where ${events.type} = 'open')::int`,
    })
    .from(events)
    .where(eq(events.listingId, id));
  const [saves] = await db.select({ n: sql<number>`count(*) filter (where saved)::int` }).from(buyerActions).where(eq(buyerActions.listingId, id));
  const engaged = await db
    .select({
      lead: leads,
      opens: sql<number>`count(*) filter (where ${events.type} = 'open')::int`,
      last: sql<Date>`max(${events.createdAt})`,
      saved: sql<boolean>`bool_or(${events.type} = 'save')`,
      visit: sql<boolean>`bool_or(${events.type} = 'visit_request')`,
    })
    .from(events)
    .innerJoin(leads, eq(leads.id, events.leadId))
    .where(eq(events.listingId, id))
    .groupBy(leads.id)
    .orderBy(desc(sql`max(${events.createdAt})`))
    .limit(30);
  const sharedTo = await db.select({ s: shares, lead: leads }).from(shares).innerJoin(leads, eq(leads.id, shares.leadId)).where(eq(shares.listingId, id)).orderBy(desc(shares.createdAt)).limit(50);
  const images = ms.filter((m) => m.kind === "image");
  const publicUrl = general ? listingUrl(general.code) : null;
  const stale = Date.now() - new Date(l.verifiedAt).getTime() > env.LISTING_VERIFY_DAYS * 86400000;
  const live = l.status === "available" || l.status === "on_hold";

  return (
    <div className="space-y-5">
      <PageHeader
        back="/app/properties"
        title={l.title || "Untitled property"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[l.status]}>{statusText[l.status]}</Badge> <span className="font-semibold text-stone-400">Ref {l.ref}</span> <span className="font-bold text-brand-700">{priceLabel(l)}</span>
          </span>
        }
        action={<LinkButton href={`/app/properties/${id}/edit`} variant="secondary"><Pencil className="h-4 w-4" /> Edit</LinkButton>}
      />

      {l.status === "draft" ? (
        <Card className="border-l-4 border-brand-600 p-4">
          <p className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-brand-700" /> Draft ready — review and publish</p>
          {l.missing.length ? <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" /> Please check: {l.missing.join(", ")}</p> : null}
          <div className="mt-3 flex gap-2">
            <LinkButton href={`/app/properties/${id}/edit`}>Review details</LinkButton>
            <PublishButton id={id} />
          </div>
        </Card>
      ) : null}
      {(sp.verify || stale) && live ? <VerifyBanner id={id} /> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].urlMd ?? images[0].url} alt="" className="aspect-[16/9] w-full object-cover" />
            ) : (
              <Link href={`/app/properties/${id}/edit`} className="flex aspect-[16/9] items-center justify-center bg-stone-100 text-sm font-semibold text-stone-500">+ Add photos</Link>
            )}
            {images.length > 1 ? (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto p-2">
                {images.slice(1, 12).map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={m.urlSm ?? m.url} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-stone-100 p-3">
              {keySpecs(p.type, l.fields).slice(0, 6).map((s) => (
                <span key={s.label} className="rounded-lg bg-stone-50 px-2 py-1 text-xs text-stone-600 ring-1 ring-stone-200"><b>{s.value}</b> {s.label.toLowerCase()}</span>
              ))}
              {p.locality ? <span className="rounded-lg bg-stone-50 px-2 py-1 text-xs text-stone-600 ring-1 ring-stone-200">📍 {p.locality}{p.city ? `, ${p.city}` : ""}</span> : null}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Views" value={<span className="inline-flex items-center gap-1.5"><Eye className="h-5 w-5 text-stone-400" />{stats?.views ?? 0}</span>} />
            <Stat label="Viewers" value={<span className="inline-flex items-center gap-1.5"><Users className="h-5 w-5 text-stone-400" />{stats?.viewers ?? 0}</span>} />
            <Stat label="Saves" value={<span className="inline-flex items-center gap-1.5"><Heart className="h-5 w-5 text-stone-400" />{saves?.n ?? 0}</span>} />
            <Stat label="Shared with" value={<span className="inline-flex items-center gap-1.5"><Share2 className="h-5 w-5 text-stone-400" />{sharedTo.length}</span>} />
          </div>

          {matches.length ? (
            <Card className="p-4" id="matches">
              <h2 className="font-display font-bold">✨ {matches.length} buyer{matches.length > 1 ? "s" : ""} match this property</h2>
              <p className="text-sm text-stone-500">Based on their saved requirements.</p>
              <div className="mt-3 divide-y divide-stone-100">
                {matches.slice(0, 10).map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/app/leads/${m.id}`} className="min-w-0">
                      <p className="truncate font-semibold">{m.name || m.phone}</p>
                      <p className="truncate text-xs text-stone-500">{m.stage}</p>
                    </Link>
                    <ShareButton target={{ listingId: id }} leads={opts} label="Send" variant="secondary" presetLeadId={m.id} />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <h2 className="font-display font-bold">Buyer interest</h2>
            {engaged.length === 0 && sharedTo.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">Share this property with a buyer to see who opens it, what they like and when to call.</p>
            ) : (
              <div className="mt-2 divide-y divide-stone-100">
                {engaged.map((e) => (
                  <Link key={e.lead.id} href={`/app/leads/${e.lead.id}`} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{e.lead.name || e.lead.phone}</p>
                      <p className="text-xs text-stone-500">Opened {e.opens}× · {timeAgo(e.last)}</p>
                    </div>
                    <div className="flex gap-1">
                      {e.saved ? <Badge tone="red">♥ Saved</Badge> : null}
                      {e.visit ? <Badge tone="violet">Visit</Badge> : null}
                    </div>
                  </Link>
                ))}
                {sharedTo
                  .filter((s) => !engaged.some((e) => e.lead.id === s.lead.id))
                  .map((s) => (
                    <Link key={s.s.code} href={`/app/leads/${s.lead.id}`} className="flex items-center justify-between py-2.5">
                      <p className="font-semibold">{s.lead.name || s.lead.phone}</p>
                      <Badge>Not opened yet</Badge>
                    </Link>
                  ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="space-y-3 p-4">
            <ShareButton target={{ listingId: id }} leads={opts} publicUrl={publicUrl} className="w-full" />
            {publicUrl ? (
              <a href={publicUrl} target="_blank" rel="noopener" className="flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-100 text-sm font-semibold">
                <ExternalLink className="h-4 w-4" /> View buyer page
              </a>
            ) : (
              <a href={`/app/properties/${id}/preview`} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-100 text-sm font-semibold">
                <ExternalLink className="h-4 w-4" /> Preview
              </a>
            )}
            <p className="text-xs text-stone-500">Personal links tell you exactly which buyer opened it. Public link is for groups and status.</p>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-stone-700">Status</h3>
            <StatusControls id={id} status={l.status} />
          </Card>
          <Card className="p-4 text-xs text-stone-500">
            <p>Visibility: <b>{l.visibility === "network" ? "Public (agent site & future network)" : "Private (link only)"}</b></p>
            <p className="mt-1">Location shown: <b>{l.locationPrivacy === "exact" ? "Exact pin" : l.locationPrivacy === "area" ? "Approximate area" : "Hidden"}</b></p>
            <p className="mt-1">Last verified: <b>{timeAgo(l.verifiedAt)}</b></p>
            <p className="mt-1"><CalendarCheck className="mr-1 inline h-3.5 w-3.5" />Visits: see <Link href="/app/visits" className="underline">Site visits</Link></p>
          </Card>
        </div>
      </div>
    </div>
  );
}
