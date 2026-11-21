import Link from "next/link";
import { Plus, Eye, Heart, CalendarCheck, Building2, Search, Share2 } from "lucide-react";
import { requireAgent } from "@/lib/auth/session";
import { priceLabel } from "@/lib/format";
import { agentListings } from "@/modules/listings";
import { mediaForListings } from "@/modules/media";
import { Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { statusText, statusTone } from "@/components/app/status";

export const metadata = { title: "Properties" };

const tabs = [
  { key: "active", label: "Live" },
  { key: "draft", label: "Drafts" },
  { key: "sold", label: "Sold" },
  { key: "rented", label: "Rented" },
  { key: "all", label: "All" },
] as const;


export default async function Properties({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; share?: string }> }) {
  const agent = await requireAgent();
  const sp = await searchParams;
  const status = (tabs.find((t) => t.key === sp.status)?.key ?? "active") as (typeof tabs)[number]["key"];
  const rows = await agentListings(agent.id, { status, q: sp.q?.trim() || undefined });
  const ms = await mediaForListings(rows.map((r) => r.l.id));
  const cover = (id: string) => ms.find((m) => m.listingId === id && m.kind === "image");

  return (
    <div>
      <PageHeader title="Properties" subtitle="Your inventory, organised." action={<LinkButton href="/app/properties/new"><Plus className="h-4 w-4" /> Add</LinkButton>} />
      {sp.share ? <p className="mb-3 flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm text-brand-900"><Share2 className="h-4 w-4" /> Pick a property to share with a buyer.</p> : null}
      <form className="relative mb-3">
        <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
        <input name="q" defaultValue={sp.q} placeholder="Search title, ref or locality" className="block w-full rounded-xl bg-white py-2.5 pl-9 pr-3 ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-600" />
        <input type="hidden" name="status" value={status} />
      </form>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <Link key={t.key} href={`/app/properties?status=${t.key}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${status === t.key ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty icon={<Building2 className="h-10 w-10" />} title={status === "active" ? "No live properties yet" : "Nothing here"} body="Forward photos to our WhatsApp and type done — or add one here." action={<LinkButton href="/app/properties/new">Add property</LinkButton>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const c = cover(r.l.id);
            return (
              <Link key={r.l.id} href={`/app/properties/${r.l.id}${sp.share ? "?share=1" : ""}`}>
                <Card className="flex gap-3 overflow-hidden p-2.5 transition hover:ring-brand-500">
                  <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                    {c ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.urlSm ?? c.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-stone-400"><Building2 className="h-6 w-6" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge tone={statusTone[r.l.status]}>{statusText[r.l.status]}</Badge>
                      <span className="text-xs font-semibold text-stone-400">{r.l.ref}</span>
                    </div>
                    <p className="mt-1 truncate font-semibold">{r.l.title || "Untitled"}</p>
                    <p className="text-sm font-bold text-brand-700">{priceLabel(r.l)}</p>
                    <div className="mt-1 flex gap-3 text-xs text-stone-500">
                      <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {r.views}</span>
                      <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {r.saves}</span>
                      <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" /> {r.visitCount}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
