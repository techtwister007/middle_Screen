import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Phone, MessageCircle, Flame, Heart, ThumbsDown, ThumbsUp } from "lucide-react";
import { db } from "@/db";
import { questions, visits, listings } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { formatPhone, waLink } from "@/lib/phone";
import { dateLabel, priceLabel, timeAgo } from "@/lib/format";
import { getOwnLead, leadIntent, leadNotes, leadProperties, leadTimeline, stageLabels } from "@/modules/leads";
import { matchingListingsForLead } from "@/modules/matching";
import { leadOptions } from "@/modules/lead-options";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { ShareButton } from "@/components/app/ShareDialog";
import { RequirementFields, requirementSummary } from "@/components/app/RequirementFields";
import { saveRequirementAction, deleteLeadAction } from "@/app/app/_actions/leads";
import { StageSelect, FollowUp, NoteForm, EditInfo, SubmitReq } from "./parts";

const ev: Record<string, string> = {
  open: "Opened",
  gallery: "Browsed photos",
  video: "Watched the video",
  map: "Checked the location",
  call: "Tapped Call",
  whatsapp: "Tapped WhatsApp",
  save: "Saved ♥",
  unsave: "Removed from saved",
  react: "Reacted",
  rank: "Ranked",
  compare: "Compared properties",
  ask: "Asked a question",
  visit_request: "Requested a site visit",
  share: "Shared with someone",
  dwell: "Spent time viewing",
};

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const agent = await requireAgent();
  const { id } = await params;
  const lead = await getOwnLead(agent.id, id);
  if (!lead) notFound();
  const [intent, timeline, props, notesList, vs, qs, matches, opts] = await Promise.all([
    leadIntent(id),
    leadTimeline(id, 60),
    leadProperties(id),
    leadNotes(id),
    db.select({ v: visits, title: listings.title }).from(visits).leftJoin(listings, eq(listings.id, visits.listingId)).where(eq(visits.leadId, id)).orderBy(desc(visits.createdAt)),
    db.select({ q: questions, title: listings.title }).from(questions).leftJoin(listings, eq(listings.id, questions.listingId)).where(eq(questions.leadId, id)).orderBy(desc(questions.createdAt)),
    matchingListingsForLead(agent.id, id),
    leadOptions(agent.id),
  ]);
  const shownIds = new Set(props.listings.map((l) => l.id));
  const newMatches = matches.filter((m) => !shownIds.has(m.l.id));
  const tone = intent.level === "hot" ? "red" : intent.level === "interested" ? "amber" : intent.level === "exploring" ? "blue" : "stone";
  const waMsg = `Hi ${lead.name.split(" ")[0] || ""}!`;

  return (
    <div className="space-y-5">
      <PageHeader back="/app/leads" title={lead.name || formatPhone(lead.phone) || "Unnamed lead"} subtitle={<span>{lead.phone ? formatPhone(lead.phone) : "No number"} {lead.phoneVerified ? <Badge tone="green">✓ WhatsApp verified</Badge> : null} · added {timeAgo(lead.createdAt)}</span>} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Avatar name={lead.name || "?"} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={tone}>
                    {intent.level === "hot" ? <Flame className="h-3 w-3" /> : null}
                    {intent.level === "hot" ? "Hot lead" : intent.level === "interested" ? "Interested" : intent.level === "exploring" ? "Exploring" : "No activity yet"}
                  </Badge>
                  <StageSelect id={id} stage={lead.stage} />
                </div>
                {intent.reasons.length ? <p className="mt-2 text-sm text-stone-600">Why: {intent.reasons.join(" · ")}</p> : <p className="mt-2 text-sm text-stone-500">Share a property to start tracking interest.</p>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {lead.phone ? (
                <>
                  <a href={`tel:+${lead.phone}`} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-stone-100 text-sm font-semibold"><Phone className="h-4 w-4" /> Call</a>
                  <a href={waLink(lead.phone, waMsg)} target="_blank" rel="noopener" className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                </>
              ) : (
                <div className="col-span-2"><EditInfo id={id} name={lead.name} phone={lead.phone ?? ""} /></div>
              )}
              <Link href={`/app/collections/new?lead=${id}`} className="flex h-10 items-center justify-center rounded-xl bg-brand-700 text-sm font-semibold text-white">Shortlist</Link>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-display font-bold">Properties shared</h2>
            {props.listings.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">Nothing shared yet.</p>
            ) : (
              <div className="mt-2 divide-y divide-stone-100">
                {props.listings.map((l) => {
                  const a = props.actions.filter((x) => x.listingId === l.id);
                  const saved = a.some((x) => x.saved);
                  const like = a.some((x) => x.reaction === "like");
                  const dislike = a.some((x) => x.reaction === "dislike");
                  const rank = a.find((x) => x.rank)?.rank;
                  const sh = props.shares.find((s) => s.listingId === l.id);
                  return (
                    <Link key={l.id} href={`/app/properties/${l.id}`} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{l.title}</p>
                        <p className="text-xs text-stone-500">{priceLabel(l)} · {sh ? (sh.opens ? `opened ${sh.opens}×` : "not opened yet") : "via shortlist"}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {rank ? <Badge tone="brand">#{rank}</Badge> : null}
                        {saved ? <Badge tone="red"><Heart className="h-3 w-3" /></Badge> : null}
                        {like ? <Badge tone="green"><ThumbsUp className="h-3 w-3" /></Badge> : null}
                        {dislike ? <Badge><ThumbsDown className="h-3 w-3" /></Badge> : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {newMatches.length ? (
            <Card className="p-4">
              <h2 className="font-display font-bold">✨ Matches from your inventory</h2>
              <div className="mt-2 divide-y divide-stone-100">
                {newMatches.slice(0, 8).map((m) => (
                  <div key={m.l.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/app/properties/${m.l.id}`} className="min-w-0">
                      <p className="truncate font-semibold">{m.l.title}</p>
                      <p className="text-xs text-stone-500">{priceLabel(m.l)} · {m.p.locality}</p>
                    </Link>
                    <ShareButton target={{ listingId: m.l.id }} leads={opts} presetLeadId={id} label="Send" variant="secondary" />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {qs.length || vs.length ? (
            <Card className="p-4">
              <h2 className="font-display font-bold">Questions & visits</h2>
              <div className="mt-2 space-y-2">
                {qs.map((q) => (
                  <div key={q.q.id} className="rounded-xl bg-sky-50 p-3 text-sm">
                    <p className="font-medium text-sky-900">“{q.q.text}”</p>
                    <p className="text-xs text-sky-700">{q.title} · {timeAgo(q.q.createdAt)}</p>
                  </div>
                ))}
                {vs.map((v) => (
                  <Link key={v.v.id} href="/app/visits" className="block rounded-xl bg-violet-50 p-3 text-sm">
                    <p className="font-medium text-violet-900">Site visit · {v.v.status}</p>
                    <p className="text-xs text-violet-700">{v.title} · {v.v.scheduledAt ? dateLabel(v.v.scheduledAt, true) : `${v.v.requestedDate} ${v.v.requestedSlot}`}</p>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <h2 className="font-display font-bold">Activity timeline</h2>
            {timeline.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No activity yet.</p>
            ) : (
              <ol className="mt-3 space-y-3 border-l-2 border-stone-100 pl-4">
                {timeline.map((t) => (
                  <li key={t.e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
                    <p className="text-sm">
                      <b>{ev[t.e.type] ?? t.e.type}</b>
                      {t.e.type === "dwell" && t.e.meta?.sec ? ` (${Math.round(Number(t.e.meta.sec) / 60) || "<1"} min)` : ""}
                      {t.title ? <span className="text-stone-500"> — {t.title}</span> : null}
                    </p>
                    <p className="text-xs text-stone-400">{dateLabel(t.e.createdAt, true)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-stone-700">Next follow-up</h3>
            <FollowUp id={id} at={lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toISOString() : null} note={lead.followUpNote} />
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-stone-700">Notes</h3>
            <NoteForm id={id} />
            <div className="mt-3 space-y-2">
              {notesList.map((n) => (
                <div key={n.id} className="rounded-xl bg-stone-50 p-2.5 text-sm">
                  <p className="whitespace-pre-line">{n.text}</p>
                  <p className="mt-1 text-[11px] text-stone-400">{dateLabel(n.createdAt, true)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-1 text-sm font-bold text-stone-700">Requirement</h3>
            <p className="mb-3 text-xs text-stone-500">{requirementSummary(lead.requirement) || "Not set — add it to get automatic matches."}</p>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-700">Edit requirement</summary>
              <form action={async (fd) => { "use server"; await saveRequirementAction(id, fd); }} className="mt-3 space-y-3">
                <RequirementFields r={lead.requirement} />
                <SubmitReq />
              </form>
            </details>
          </Card>
          {lead.phone ? (
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-bold text-stone-700">Contact details</h3>
              <EditInfo id={id} name={lead.name} phone={lead.phone} />
            </Card>
          ) : null}
          <p className="text-center text-xs text-stone-400">Stage: {stageLabels[lead.stage]} · Source: {lead.source}</p>
          <form action={deleteLeadAction.bind(null, id)}>
            <button className="w-full text-center text-xs font-semibold text-red-600">Delete lead</button>
          </form>
        </div>
      </div>
    </div>
  );
}
