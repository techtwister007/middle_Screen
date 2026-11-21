import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { requireAgent } from "@/lib/auth/session";
import { timeAgo } from "@/lib/format";
import { agentLeads, stageLabels } from "@/modules/leads";
import { Avatar, Badge, Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import type { LeadStage } from "@/db/schema";

export const metadata = { title: "Buyers" };

const filters: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "followup", label: "Follow-up" },
  { key: "new", label: "New" },
  { key: "interested", label: "Interested" },
  { key: "visit", label: "Visit" },
  { key: "negotiating", label: "Negotiating" },
  { key: "closed", label: "Closed" },
  { key: "lost", label: "Lost" },
];

const eventText: Record<string, string> = {
  open: "Opened",
  gallery: "Browsed photos of",
  video: "Watched video of",
  save: "Saved",
  unsave: "Unsaved",
  react: "Reacted to",
  rank: "Ranked",
  ask: "Asked about",
  visit_request: "Requested visit for",
  whatsapp: "Tapped WhatsApp on",
  call: "Tapped call on",
  map: "Checked location of",
  share: "Shared",
  dwell: "Spent time on",
  compare: "Compared properties",
};

export default async function Leads({ searchParams }: { searchParams: Promise<{ stage?: string; q?: string }> }) {
  const agent = await requireAgent();
  const sp = await searchParams;
  const stage = (filters.find((f) => f.key === sp.stage)?.key ?? "all") as LeadStage | "hot" | "all" | "followup";
  const rows = await agentLeads(agent.id, { stage, q: sp.q?.trim() || undefined });
  return (
    <div>
      <PageHeader title="Buyers" subtitle="Every buyer, what they saw, what they liked." action={<LinkButton href="/app/leads/new"><Plus className="h-4 w-4" /> Add</LinkButton>} />
      <form className="relative mb-3">
        <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
        <input name="q" defaultValue={sp.q} placeholder="Search name or number" className="block w-full rounded-xl bg-white py-2.5 pl-9 pr-3 ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-brand-600" />
        <input type="hidden" name="stage" value={stage} />
      </form>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <Link key={f.key} href={`/app/leads?stage=${f.key}`} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${stage === f.key ? "bg-brand-700 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"}`}>
            {f.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty icon={<Users className="h-10 w-10" />} title="No buyers here yet" body="Buyers appear automatically when you share a property with a buyer, or when a buyer enquires from your link." action={<LinkButton href="/app/leads/new">Add a buyer</LinkButton>} />
      ) : (
        <Card className="divide-y divide-stone-100">
          {rows.map(({ lead, sharedCount, lastEvent }) => {
            const [type, title] = (lastEvent ?? "").split("|");
            const hot = lead.intentScore >= 45;
            return (
              <Link key={lead.id} href={`/app/leads/${lead.id}`} className="flex items-center gap-3 p-3.5 hover:bg-stone-50">
                <Avatar name={lead.name || "?"} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold">
                    {lead.name || lead.phone || "Unnamed"} {lead.phoneVerified ? <span title="Verified on WhatsApp" className="text-emerald-600">✓</span> : null}
                  </p>
                  <p className="truncate text-xs text-stone-500">{type ? `${eventText[type] ?? type} ${title}` : `${sharedCount} shared`}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={hot ? "red" : lead.intentScore >= 22 ? "amber" : "stone"}>{hot ? "Hot" : stageLabels[lead.stage]}</Badge>
                  <span className="text-[11px] text-stone-400">{timeAgo(lead.lastActivityAt ?? lead.createdAt)}</span>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
