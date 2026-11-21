import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Bell } from "lucide-react";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { timeAgo } from "@/lib/format";
import { markAllReadAction } from "@/app/app/_actions/misc";
import { Card, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Activity" };

export default async function Activity() {
  const agent = await requireAgent();
  const rows = await db.select().from(notifications).where(eq(notifications.agentId, agent.id)).orderBy(desc(notifications.createdAt)).limit(150);
  const unread = rows.some((r) => !r.readAt);
  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle="Everything your buyers do, as it happens."
        action={unread ? (
          <form action={markAllReadAction}>
            <button className="h-9 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-stone-200">Mark all read</button>
          </form>
        ) : null}
      />
      {rows.length === 0 ? (
        <Empty icon={<Bell className="h-10 w-10" />} title="No activity yet" body="When buyers open, save or enquire on your links, it shows up here — and as a phone notification." />
      ) : (
        <Card className="divide-y divide-stone-100">
          {rows.map((n) => (
            <Link key={n.id} href={n.href ?? "#"} className={`flex items-start gap-3 p-3.5 hover:bg-stone-50 ${n.readAt ? "" : "bg-brand-50/40"}`}>
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-stone-300" : "bg-brand-600"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body ? <p className="text-sm text-stone-500">{n.body}</p> : null}
              </div>
              <span className="shrink-0 text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
