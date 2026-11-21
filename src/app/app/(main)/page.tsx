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
    <div className="stagger space-y-6">
      {sp.welcome ? (
        <div className="rounded-[22px] bg-brand-800 p-5 text-white [background:#1f4d36]">
          <p className="text-lg font-semibold">You&apos;re all set!</p>
          <p className="mt-1 text-sm text-white/85">Add your first property: forward photos to our WhatsApp, or tap Add property below. You&apos;ll have a beautiful link in a minute.</p>
        </div>
      ) : null}
      <div>
        <p className="text-sm text-stone-500">{greet}</p>
        <h1 className="mt-0.5 text-[26px] font-semibold leading-tight tracking-tight">Hello, {agent.name.split(" ")[0] || "there"}</h1>
      </div>

      <Card className="p-4">
        <h2 className="mb-3.5 text-base font-semibold">What would you like to do?</h2>
        <div className="grid grid-cols-4 gap-1">
          {[
            { href: "/app/properties/new", label: "Add property", icon: Plus },
            { href: "/app/leads/new", label: "Add buyer", icon: UserPlus },
            { href: "/app/collections/new", label: "New collection", icon: LayoutGrid },
            { href: "/app/properties?share=1", label: "Share property", icon: Share2 },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="press group flex flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center text-[12.5px] font-medium leading-tight text-stone-800">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-brand-50 text-brand-800 transition-transform duration-200 group-hover:-translate-y-0.5">
                <a.icon className="h-[22px] w-[22px]" />
              </span>
              {a.label}
            </Link>
          ))}
        </div>
      </Card>

      <a href={waLink(botNumber(), "help")} target="_blank" rel="noopener" className="press flex items-center gap-3 rounded-[20px] p-4 text-sm text-white [background:#1f4d36]">
        <MessageCircle className="h-6 w-6 shrink-0" />
        <span className="leading-snug">
          <b className="block text-[15px] font-semibold">Fastest way to add a property</b>
          Forward photos and a voice note to our WhatsApp, then type <b>done</b>.
        </span>
        <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-white/80" />
      </a>

      <section>
        <h2 className="mb-2.5 text-lg font-semibold">Your business today</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/app/properties", label: "Live properties", n: active.n },
            { href: "/app/leads", label: "Active buyers", n: leadCount.n },
            { href: "/app/visits", label: "Visits today", n: today.length },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="press">
              <Card className="h-full p-3.5 transition-shadow hover:shadow-float">
                <p className="tnum text-[26px] font-bold leading-none tracking-tight">{x.n}</p>
                <p className="mt-1.5 text-[13px] leading-tight text-stone-500">{x.label}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {pushEnabled() ? <PushPrompt publicKey={env.VAPID_PUBLIC_KEY!} /> : null}

      <section>
        <h2 className="mb-2.5 flex items-center gap-2 text-lg font-semibold">
          Needs your attention {attention ? <Badge tone="red">{attention}</Badge> : null}
        </h2>
        {attention === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-sm text-stone-500">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Sparkle /></span>
            All caught up. Share a property with a buyer to see their interest here.
          </Card>
        ) : (
          <Card className="divide-y divide-stone-100 px-1">
            {requests.map((r) => (
              <Row key={r.v.id} href={`/app/visits?highlight=${r.v.id}`} icon={<CalendarClock className="h-[18px] w-[18px]" />} tone="bg-violet-50 text-violet-700" title={`${r.name || "A buyer"} wants a site visit`} sub={`${r.title} · ${r.v.requestedDate} ${r.v.requestedSlot}`} end={<Badge tone="violet">Confirm</Badge>} />
            ))}
            {unanswered.map((q) => (
              <Row key={q.q.id} href={q.q.leadId ? `/app/leads/${q.q.leadId}` : "/app/leads"} icon={<HelpCircle className="h-[18px] w-[18px]" />} tone="bg-sky-50 text-sky-700" title={`${q.name || "A buyer"} asked a question`} sub={`“${q.q.text}”`} end={<span className="text-xs text-stone-500">{timeAgo(q.q.createdAt)}</span>} />
            ))}
            {hot.map((l) => (
              <Row key={l.id} href={`/app/leads/${l.id}`} icon={<Flame className="h-[18px] w-[18px]" />} tone="bg-amber-50 text-amber-700" title={l.name || l.phone || "Buyer"} sub={`${l.intentScore >= 45 ? "Ready to visit, call now" : "Showing interest"} · ${timeAgo(l.lastActivityAt)}`} end={<Badge tone={l.intentScore >= 45 ? "red" : "amber"}>{l.intentScore >= 45 ? "Hot" : "Interested"}</Badge>} />
            ))}
            {followups.map((l) => (
              <Row key={l.id} href={`/app/leads/${l.id}`} icon={<PhoneCall className="h-[18px] w-[18px]" />} tone="bg-emerald-50 text-emerald-700" title={`Follow up with ${l.name || l.phone || "buyer"}`} sub={l.followUpNote || "Scheduled follow-up"} end={<Badge tone={new Date(l.nextFollowUpAt!) < new Date() ? "red" : "green"}>{new Date(l.nextFollowUpAt!) < new Date() ? "Overdue" : "Today"}</Badge>} />
            ))}
          </Card>
        )}
      </section>

      {today.length ? (
        <section>
          <h2 className="mb-2.5 text-lg font-semibold">Today&apos;s site visits</h2>
          <Card className="divide-y divide-stone-100 px-1">
            {today.map((t) => (
              <Link key={t.v.id} href="/app/visits" className="press flex items-center gap-3 rounded-2xl p-3.5 hover:bg-stone-50">
                <span className="tnum w-16 shrink-0 font-semibold text-brand-700">{t.v.scheduledAt!.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{t.lead?.name ?? "Buyer"}</p>
                  <p className="truncate text-[13px] text-stone-500">{t.listing?.title}</p>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <Link href="/app/activity" className="text-sm font-semibold text-brand-700">See all</Link>
        </div>
        {recent.length ? (
          <Card className="divide-y divide-stone-100 px-1">
            {recent.map((n) => (
              <Link key={n.id} href={n.href ?? "/app/activity"} className="press flex items-start gap-3 rounded-2xl p-3.5 hover:bg-stone-50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-stone-300" : "bg-brand-600"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{n.title}</p>
                  {n.body ? <p className="truncate text-[13px] text-stone-500">{n.body}</p> : null}
                </div>
                <span className="shrink-0 text-xs text-stone-500">{timeAgo(n.createdAt)}</span>
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

function Row({ href, icon, tone, title, sub, end }: { href: string; icon: React.ReactNode; tone: string; title: string; sub: string; end: React.ReactNode }) {
  return (
    <Link href={href} className="press flex items-center gap-3 rounded-2xl p-3.5 hover:bg-stone-50">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{title}</p>
        <p className="truncate text-[13px] text-stone-500">{sub}</p>
      </div>
      {end}
    </Link>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
