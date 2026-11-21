import Link from "next/link";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { Plus, Share2, LayoutGrid, UserPlus, Flame, CalendarClock, PhoneCall, HelpCircle, MessageCircle, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { leads, listings, notifications, questions, visits } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { timeAgo } from "@/lib/format";
import { waLink } from "@/lib/phone";
import { botNumber } from "@/lib/wa";
import { todaysVisits } from "@/modules/visits";
import { Card, Badge } from "@/components/ui";
import { PushPrompt } from "@/components/app/PushPrompt";
import { pushEnabled } from "@/lib/push";
import { env } from "@/config/env";

export default async function Home({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const agent = await requireAgent();
  const sp = await searchParams;
  const aid = agent.id;
  const endOfDay = new Date(Date.now() + 86400000);
  const [[active], [leadCount], today, hot, requests, followups, unanswered, recent] = await Promise.all([
    db.select({ n: count() }).from(listings).where(and(eq(listings.agentId, aid), inArray(listings.status, ["available", "on_hold"]))),
    db.select({ n: count() }).from(leads).where(and(eq(leads.agentId, aid), inArray(leads.stage, ["new", "exploring", "interested", "visit", "negotiating"]))),
    todaysVisits(aid),
    db.select().from(leads).where(and(eq(leads.agentId, aid), gte(leads.intentScore, 22), inArray(leads.stage, ["new", "exploring", "interested", "visit", "negotiating"]), sql`(${leads.lastContactedAt} is null or ${leads.lastContactedAt} < ${leads.lastActivityAt})`)).orderBy(desc(leads.intentScore), desc(leads.lastActivityAt)).limit(5),
    db.select({ v: visits, name: leads.name, title: listings.title }).from(visits).leftJoin(leads, eq(leads.id, visits.leadId)).leftJoin(listings, eq(listings.id, visits.listingId)).where(and(eq(visits.agentId, aid), eq(visits.status, "requested"))).orderBy(desc(visits.createdAt)).limit(5),
    db.select().from(leads).where(and(eq(leads.agentId, aid), isNotNull(leads.nextFollowUpAt), lte(leads.nextFollowUpAt, endOfDay))).orderBy(leads.nextFollowUpAt).limit(5),
    db.select({ q: questions, name: leads.name }).from(questions).leftJoin(leads, eq(leads.id, questions.leadId)).where(and(eq(questions.agentId, aid), isNull(questions.answeredAt), gte(questions.createdAt, sql`now() - interval '7 days'`))).orderBy(desc(questions.createdAt)).limit(5),
    db.select().from(notifications).where(eq(notifications.agentId, aid)).orderBy(desc(notifications.createdAt)).limit(6),
  ]);
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const attention = hot.length + requests.length + followups.length + unanswered.length;

  return (
    <div className="space-y-6">
      {sp.welcome ? (
        <Card className="bg-brand-700 p-5 text-white ring-0">
          <p className="font-display text-lg font-bold">🎉 You&apos;re all set!</p>
          <p className="mt-1 text-sm text-white/90">Add your first property — forward photos to our WhatsApp, or use the button below. You&apos;ll have a beautiful link in a minute.</p>
        </Card>
      ) : null}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-500">{greet}</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Hello, {agent.name.split(" ")[0] || "there"} 👋</h1>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { href: "/app/properties/new", label: "Add property", icon: Plus },
          { href: "/app/properties?share=1", label: "Share", icon: Share2 },
          { href: "/app/collections/new", label: "Collection", icon: LayoutGrid },
          { href: "/app/leads/new", label: "Add lead", icon: UserPlus },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white px-1 py-3 text-center text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:ring-brand-500">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <a.icon className="h-5 w-5" />
            </span>
            {a.label}
          </Link>
        ))}
      </div>

      <a href={waLink(botNumber(), "help")} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl bg-[#25D366]/10 p-3 text-sm ring-1 ring-[#25D366]/30">
        <MessageCircle className="h-5 w-5 shrink-0 text-[#128C7E]" />
        <span className="text-stone-700">
          <b>Fastest way:</b> forward property photos to our WhatsApp and type <b>done</b>.
        </span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-stone-400" />
      </a>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/app/properties"><Card className="p-3.5"><p className="text-xs font-medium text-stone-500">Live properties</p><p className="font-display text-2xl font-bold">{active.n}</p></Card></Link>
        <Link href="/app/leads"><Card className="p-3.5"><p className="text-xs font-medium text-stone-500">Active leads</p><p className="font-display text-2xl font-bold">{leadCount.n}</p></Card></Link>
        <Link href="/app/visits"><Card className="p-3.5"><p className="text-xs font-medium text-stone-500">Visits today</p><p className="font-display text-2xl font-bold">{today.length}</p></Card></Link>
      </div>

      {pushEnabled() ? <PushPrompt publicKey={env.VAPID_PUBLIC_KEY!} /> : null}

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
          Needs your attention {attention ? <Badge tone="red">{attention}</Badge> : null}
        </h2>
        {attention === 0 ? (
          <Card className="p-5 text-sm text-stone-500">All caught up ✨ Share a property with a buyer to see their interest here.</Card>
        ) : (
          <Card className="divide-y divide-stone-100">
            {requests.map((r) => (
              <Link key={r.v.id} href={`/app/visits?highlight=${r.v.id}`} className="flex items-center gap-3 p-3.5 hover:bg-stone-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700"><CalendarClock className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.name || "A buyer"} wants a site visit</p>
                  <p className="truncate text-xs text-stone-500">{r.title} · {r.v.requestedDate} {r.v.requestedSlot}</p>
                </div>
                <Badge tone="violet">Confirm</Badge>
              </Link>
            ))}
            {unanswered.map((q) => (
              <Link key={q.q.id} href={q.q.leadId ? `/app/leads/${q.q.leadId}` : "/app/leads"} className="flex items-center gap-3 p-3.5 hover:bg-stone-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700"><HelpCircle className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{q.name || "A buyer"} asked a question</p>
                  <p className="truncate text-xs text-stone-500">“{q.q.text}”</p>
                </div>
                <span className="text-xs text-stone-400">{timeAgo(q.q.createdAt)}</span>
              </Link>
            ))}
            {hot.map((l) => (
              <Link key={l.id} href={`/app/leads/${l.id}`} className="flex items-center gap-3 p-3.5 hover:bg-stone-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600"><Flame className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.name || l.phone}</p>
                  <p className="truncate text-xs text-stone-500">{l.intentScore >= 45 ? "Hot lead — call now" : "Showing interest"} · {timeAgo(l.lastActivityAt)}</p>
                </div>
                <Badge tone={l.intentScore >= 45 ? "red" : "amber"}>{l.intentScore >= 45 ? "Hot" : "Interested"}</Badge>
              </Link>
            ))}
            {followups.map((l) => (
              <Link key={l.id} href={`/app/leads/${l.id}`} className="flex items-center gap-3 p-3.5 hover:bg-stone-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><PhoneCall className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Follow up with {l.name || l.phone}</p>
                  <p className="truncate text-xs text-stone-500">{l.followUpNote || "Scheduled follow-up"}</p>
                </div>
                <Badge tone={new Date(l.nextFollowUpAt!) < new Date() ? "red" : "green"}>{new Date(l.nextFollowUpAt!) < new Date() ? "Overdue" : "Today"}</Badge>
              </Link>
            ))}
          </Card>
        )}
      </section>

      {today.length ? (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold">Today&apos;s site visits</h2>
          <Card className="divide-y divide-stone-100">
            {today.map((t) => (
              <Link key={t.v.id} href="/app/visits" className="flex items-center gap-3 p-3.5">
                <span className="w-16 shrink-0 font-display font-bold text-brand-700">{t.v.scheduledAt!.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{t.lead?.name ?? "Buyer"}</p>
                  <p className="truncate text-xs text-stone-500">{t.listing?.title}</p>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Recent activity</h2>
          <Link href="/app/activity" className="text-sm font-semibold text-brand-700">See all</Link>
        </div>
        {recent.length ? (
          <Card className="divide-y divide-stone-100">
            {recent.map((n) => (
              <Link key={n.id} href={n.href ?? "/app/activity"} className="flex items-start gap-3 p-3.5 hover:bg-stone-50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-stone-300" : "bg-brand-600"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body ? <p className="truncate text-xs text-stone-500">{n.body}</p> : null}
                </div>
                <span className="shrink-0 text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
              </Link>
            ))}
          </Card>
        ) : (
          <Card className="p-5 text-sm text-stone-500">Nothing yet. When buyers open your links you&apos;ll see it here instantly.</Card>
        )}
      </section>
    </div>
  );
}
