import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type OutboxMessage = { id: string; to: string; text: string | null };

/**
 * Atomically hand queued messages to the Baileys bridge (status → 'sending').
 * Messages stuck in 'sending' for 3+ minutes (bridge crashed before ack) are handed out again.
 * Concurrent callers never receive the same message → no double sends. Oldest first.
 */
export async function claimOutbox(limit = 20): Promise<OutboxMessage[]> {
  const rows = await db.execute<{ id: string; to: string; text: string | null; created_at: string }>(sql`
    update wa_messages set status = 'sending', claimed_at = now()
    where id in (
      select id from wa_messages
      where direction = 'out'
        and (status = 'queued' or (status = 'sending' and claimed_at < now() - interval '3 minutes'))
      order by created_at
      limit ${limit}
      for update skip locked
    )
    returning id, phone as "to", text, created_at`);
  return [...rows]
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map(({ id, to, text }) => ({ id, to, text }));
}
