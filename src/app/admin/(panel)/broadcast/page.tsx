import { desc } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { timeAgo } from "@/lib/format";
import { Card } from "@/components/ui";
import { broadcastAction } from "../../_actions";

export default async function Broadcast() {
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(30);
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="font-display text-2xl font-bold">Broadcast to all agents</h1>
      <Card className="p-4">
        <form action={broadcastAction} className="space-y-3">
          <input name="title" required placeholder="Title e.g. New: compare properties in collections" className="block w-full rounded-xl px-3 py-2.5 ring-1 ring-stone-300" />
          <textarea name="body" rows={3} placeholder="Message" className="block w-full rounded-xl px-3 py-2.5 ring-1 ring-stone-300" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="push" /> Also send push notification</label>
          <button className="h-10 rounded-xl bg-stone-900 px-4 font-semibold text-white">Send to everyone (in-app)</button>
        </form>
      </Card>
      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.id} className="p-3 text-sm"><p className="font-semibold">{r.title}</p><p className="text-stone-600">{r.body}</p><p className="text-xs text-stone-400">{timeAgo(r.createdAt)}</p></Card>
        ))}
      </div>
    </div>
  );
}
