import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye, Users, Heart, MessageCircle, Phone, CalendarCheck, Share2, Images, HelpCircle } from "lucide-react";
import { loadOwnerReport } from "@/modules/owner-report";
import { AgentBar, PoweredBy } from "@/components/buyer/ListingView";
import { waLink } from "@/lib/phone";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Property report", robots: { index: false, follow: false } };

const SLOT: Record<string, string> = { requested: "Requested", confirmed: "Confirmed", rescheduled: "Rescheduled", completed: "Done" };
const OUTCOME: Record<string, string> = { liked: "liked it", not_liked: "not for them", negotiating: "negotiating" };

export default async function OwnerReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await loadOwnerReport(token);
  if (!r) notFound();
  const max = Math.max(1, ...r.days.map((d) => d.n));
  const week = r.days.slice(7).reduce((s, d) => s + d.n, 0), prev = r.days.slice(0, 7).reduce((s, d) => s + d.n, 0);
  const tiles = [
    { I: Eye, v: r.totals.views, l: "Page views" },
    { I: Users, v: r.totals.people, l: "People who looked" },
    { I: Share2, v: r.totals.shared, l: "Buyers sent personally" },
    { I: Heart, v: r.totals.saved, l: "Saved it" },
    { I: HelpCircle, v: r.totals.questions, l: "Questions asked" },
    { I: Phone, v: r.totals.contacts, l: "Calls and chats" },
  ];
  const visitsDone = r.visits.filter((v) => v.status === "completed").length;
  const upcoming = r.visits.filter((v) => v.status !== "completed");
  return (
    <div style={{ ["--agent" as string]: r.agent.brandColor }} className="min-h-screen bg-stone-50 pb-16">
      <main className="page-enter mx-auto max-w-xl px-4 pt-5">
        <div className="flex items-center justify-between gap-3 [&>div:first-child]:min-w-0">
          <AgentBar agent={r.agent} compact />
          <span className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600 shadow-card">Owner report</span>
        </div>

        <section className="mt-5 overflow-hidden rounded-[24px] bg-white shadow-card">
          {r.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.cover} alt="" className="img-fade aspect-[16/9] w-full object-cover" />
          ) : null}
          <div className="p-5">
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight">{r.title}</h1>
            <p className="mt-1 text-[15px] text-stone-500">{r.place}</p>
            <p className="tnum mt-3 text-[26px] font-bold leading-none tracking-tight text-agent">{r.price}</p>
            <p className="mt-2 text-sm text-stone-500">Listed {timeAgo(r.listedAt)} · {r.status === "available" ? "Live" : r.status === "on_hold" ? "On hold" : r.status === "sold" ? "Sold" : r.status === "rented" ? "Rented" : "Not live"}</p>
          </div>
        </section>

        <section className="stagger tnum mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-label="Totals">
          {tiles.map((t) => (
            <div key={t.l} className="rounded-[20px] bg-white p-4 shadow-card">
              <t.I className="h-[18px] w-[18px] text-agent" />
              <p className="mt-2 text-[26px] font-bold leading-none">{t.v}</p>
              <p className="mt-1 text-[13px] leading-tight text-stone-500">{t.l}</p>
            </div>
          ))}
        </section>

        <section className="mt-4 rounded-[20px] bg-white p-5 shadow-card">
          <h2 className="font-semibold">Views, last 14 days</h2>
          <p className="tnum mt-0.5 text-sm text-stone-500">
            {week} this week{prev || week ? ` · ${week >= prev ? "up" : "down"} from ${prev} the week before` : ""}
          </p>
          {r.totals.views === 0 ? (
            <p className="mt-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">No views yet. Views start as soon as {r.agent.name?.split(" ")[0] || "your agent"} shares the link with buyers.</p>
          ) : (
          <div className="tnum mt-4 flex h-28 items-end gap-1" role="img" aria-label={`Views per day: ${r.days.map((d) => d.n).join(", ")}`}>
            {r.days.map((d, i) => (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full origin-bottom rounded-t-md [animation:col-grow_.6s_cubic-bezier(.22,1,.36,1)_backwards]"
                  style={{ height: `${Math.max(4, (d.n / max) * 100)}%`, background: d.n ? "var(--agent)" : "var(--color-stone-200)", animationDelay: `${i * 25}ms` }}
                  title={`${d.n} on ${d.key}`}
                />
                <span className="text-[10px] text-stone-500">{i % 2 === 1 ? d.label : ""}</span>
              </div>
            ))}
          </div>
          )}
        </section>

        <section className="mt-4 rounded-[20px] bg-white p-5 shadow-card">
          <h2 className="font-semibold">Site visits</h2>
          <p className="tnum mt-0.5 text-sm text-stone-500">{visitsDone} done · {upcoming.length} coming up</p>
          {r.visits.length ? (
            <ul className="mt-3 divide-y divide-stone-100">
              {r.visits.map((v, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 text-[15px]">
                  <CalendarCheck className="h-4 w-4 shrink-0 text-stone-500" />
                  <span className="flex-1">{v.at ? new Date(v.at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : v.date ? new Date(`${v.date}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Date to be fixed"}</span>
                  <span className="text-sm text-stone-500">{SLOT[v.status]}{v.outcome ? `, ${OUTCOME[v.outcome]}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-stone-600">No visits yet. Your agent will update you when buyers ask.</p>}
        </section>

        <section className="mt-4 rounded-[20px] bg-white p-5 shadow-card">
          <h2 className="font-semibold">Interested buyers</h2>
          <p className="mt-0.5 text-sm text-stone-500">Names are kept private. Your agent follows up with each one.</p>
          {r.buyers.length ? (
            <ul className="tnum mt-3 divide-y divide-stone-100">
              {r.buyers.map((b) => (
                <li key={b.label} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[13px] font-semibold text-stone-600">{b.label.split(" ")[1]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{b.visit ? "Asked for a site visit" : b.saved ? "Saved it to compare" : b.photos ? "Looked through the photos" : "Opened the page"}</p>
                    <p className="text-xs text-stone-500">Opened {b.opens} time{b.opens === 1 ? "" : "s"} · last {timeAgo(b.last)}</p>
                  </div>
                  {b.photos ? <Images className="h-4 w-4 text-stone-400" aria-label="Viewed photos" /> : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-stone-600">No buyer activity yet.</p>}
        </section>

        <a href={waLink(r.agent.phone, `Hi ${r.agent.name || r.agent.displayName}, about ${r.title}:`)} className="press mt-5 flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#1f8f4e] font-semibold text-white">
          <MessageCircle className="h-5 w-5" /> Message {r.agent.name?.split(" ")[0] || r.agent.displayName}
        </a>
        <p className="mt-6 text-center text-xs text-stone-500">Updated live · <PoweredBy /></p>
      </main>
    </div>
  );
}
