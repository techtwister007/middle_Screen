import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { CalendarCheck, Heart, PhoneCall, Send, ThumbsDown, ThumbsUp, Eye, Images, MapPin, Phone, MessageCircle, HelpCircle, Share2, Clock, Bookmark } from "lucide-react";
import { db } from "@/db";
import { questions, visits, listings } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { formatPhone } from "@/lib/phone";
import { dateLabel, priceLabel, timeAgo } from "@/lib/format";
import { getOwnLead, leadIntent, leadNotes, leadProperties, leadTimeline, stageLabels } from "@/modules/leads";
import { matchingListingsForLead } from "@/modules/matching";
import { leadOptions } from "@/modules/lead-options";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { ShareButton } from "@/components/app/ShareDialog";
import { ContactButtons, ReplyToQuestion } from "@/components/app/ContactButtons";
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
  place: "Checked the distance to their place",
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
      <div className="page-enter">
        <Link href="/app/leads" className="press mb-3 inline-flex h-10 items-center gap-1 rounded-full bg-white px-3.5 text-sm font-semibold text-stone-700 shadow-card">← Buyers</Link>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="stagger space-y-4">
          <Card className="flex items-center gap-4 p-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white [background:#1f4d36]">{(lead.name || "?").split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}</span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[22px] font-semibold leading-tight tracking-tight">{lead.name || formatPhone(lead.phone) || "Unnamed buyer"}</h1>
              <p className="tnum mt-0.5 text-sm text-stone-500">{lead.phone ? formatPhone(lead.phone) : "No number"}{lead.phoneVerified ? " · WhatsApp verified" : ""} · added {timeAgo(lead.createdAt)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold ${intent.level === "hot" ? "bg-amber-50 text-amber-800" : intent.level === "interested" ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {intent.level === "hot" ? "Ready to visit" : intent.level === "interested" ? "Interested" : intent.level === "exploring" ? "Browsing" : "No activity yet"}
                </span>
                <StageSelect id={id} stage={lead.stage} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            {intent.reasons.length ? <p className="text-[15px] text-stone-700"><b className="font-semibold text-stone-900">Why:</b> {intent.reasons.join(" · ")}</p> : <p className="text-[15px] text-stone-500">Share a property to start tracking interest.</p>}
            <div className="mt-3 grid grid-cols-3 gap-1" aria-hidden>
              {[0, 1, 2].map((i) => {
                const lvl = intent.level === "hot" ? 3 : intent.level === "interested" ? 2 : intent.level === "exploring" ? 1 : 0;
                return <span key={i} className={`h-1.5 origin-left rounded-full ${i < lvl ? "bg-amber-500 [animation:bar-grow_.6s_cubic-bezier(.22,1,.36,1)_both]" : "bg-stone-200"}`} style={{ animationDelay: `${150 + i * 120}ms` }} />;
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-stone-500"><span>Browsing</span><span>Interested</span><span>Ready to visit</span></div>
          </Card>

          {(() => {
            const req = vs.find((v) => v.v.status === "requested");
            const due = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt).getTime() < Date.now() + 86400000;
            const next = req
              ? { label: "Confirm site visit", sub: `${req.v.requestedDate ?? ""} ${req.v.requestedSlot ?? ""}, ${req.title ?? "property"}`, href: `/app/visits?highlight=${req.v.id}`, cta: "Open visit", icon: <CalendarCheck className="h-4 w-4" /> }
              : due
                ? { label: `Follow up with ${lead.name.split(" ")[0] || "this buyer"}`, sub: lead.followUpNote || "A follow-up is due", href: lead.phone ? `tel:+${lead.phone}` : "#", cta: "Call now", icon: <PhoneCall className="h-4 w-4" /> }
                : { label: "Send more homes", sub: newMatches.length ? `${newMatches.length} of your properties match` : "Make a shortlist they can like and compare", href: `/app/collections/new?lead=${id}`, cta: "Make a shortlist", icon: <Send className="h-4 w-4" /> };
            return (
              <div className="rounded-[20px] bg-brand-50 p-4">
                <p className="text-[13px] font-semibold text-brand-800">Next action</p>
                <p className="mt-1 text-[17px] font-semibold">{next.label}</p>
                <p className="text-sm text-stone-600">{next.sub}</p>
                <a href={next.href} className="press mt-3 inline-flex h-11 items-center gap-2 rounded-[14px] px-4 text-[15px] font-semibold text-white [background:#1f4d36]">{next.icon}{next.cta}</a>
              </div>
            );
          })()}

          <div className="grid grid-cols-3 gap-2">
            {lead.phone ? (
              <ContactButtons leadId={id} phone={lead.phone} message={waMsg} />
            ) : (
              <div className="col-span-2"><EditInfo id={id} name={lead.name} phone={lead.phone ?? ""} /></div>
            )}
            <Link href={`/app/collections/new?lead=${id}`} className="press flex h-11 items-center justify-center rounded-[14px] bg-brand-700 text-sm font-semibold text-white">Shortlist</Link>
          </div>

          <Card className="p-4">
            <h2 className="text-[17px] font-semibold">Properties shared</h2>
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
              <h2 className="text-[17px] font-semibold">Matches from your inventory</h2>
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
              <h2 className="text-[17px] font-semibold">Questions & visits</h2>
              <div className="mt-2 space-y-2">
                {qs.map((q) => (
                  <div key={q.q.id} className="rounded-xl bg-sky-50 p-3 text-sm">
                    <p className="font-medium text-sky-900">“{q.q.text}”</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-xs text-sky-700">{q.title} · {timeAgo(q.q.createdAt)}</p>
                      <ReplyToQuestion questionId={q.q.id} phone={lead.phone} question={q.q.text} title={q.title} answered={!!q.q.answeredAt} />
                    </div>
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
            <h2 className="text-[17px] font-semibold">Activity timeline</h2>
            {timeline.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">No activity yet.</p>
            ) : (
              <ol className="mt-3">
                {timeline.map((t, i) => (
                  <li key={t.e.id} className="relative grid grid-cols-[32px_1fr] gap-3 pb-4 last:pb-0">
                    {i < timeline.length - 1 ? <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-stone-100" /> : null}
                    <span className="z-[1] flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-800"><TlIcon type={t.e.type} /></span>
                    <div>
                    <p className="text-sm">
                      <b>{ev[t.e.type] ?? t.e.type}</b>
                      {t.e.type === "dwell" && t.e.meta?.sec ? ` (${Math.round(Number(t.e.meta.sec) / 60) || "<1"} min)` : ""}
                      {t.e.type === "place" && t.e.meta?.name ? `: ${String(t.e.meta.name)} (${String(t.e.meta.km)} km)` : ""}
                      {t.title ? <span className="text-stone-500"> — {t.title}</span> : null}
                    </p>
                    <p className="text-xs text-stone-500">{dateLabel(t.e.createdAt, true)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 text-[15px] font-semibold text-stone-900">Next follow-up</h3>
            <FollowUp id={id} at={lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toISOString() : null} note={lead.followUpNote} />
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-[15px] font-semibold text-stone-900">Notes</h3>
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
            <h3 className="mb-1 text-[15px] font-semibold text-stone-900">Requirement</h3>
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
              <h3 className="mb-2 text-[15px] font-semibold text-stone-900">Contact details</h3>
              <EditInfo id={id} name={lead.name} phone={lead.phone} />
            </Card>
          ) : null}
          <p className="text-center text-xs text-stone-400">Stage: {stageLabels[lead.stage]} · Source: {lead.source}</p>
          <form action={deleteLeadAction.bind(null, id)}>
            <button className="w-full text-center text-xs font-semibold text-red-600">Delete buyer</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TlIcon({ type }: { type: string }) {
  const c = "h-4 w-4";
  if (type === "open" || type === "dwell") return <Eye className={c} />;
  if (type === "gallery" || type === "video") return <Images className={c} />;
  if (type === "map" || type === "place") return <MapPin className={c} />;
  if (type === "call") return <Phone className={c} />;
  if (type === "whatsapp") return <MessageCircle className={c} />;
  if (type === "save" || type === "unsave") return <Heart className={c} />;
  if (type === "ask") return <HelpCircle className={c} />;
  if (type === "visit_request") return <CalendarCheck className={c} />;
  if (type === "share") return <Share2 className={c} />;
  if (type === "rank" || type === "react" || type === "compare") return <Bookmark className={c} />;
  return <Clock className={c} />;
}
