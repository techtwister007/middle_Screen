import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";

/** Compact lead list for share pickers. */
export async function leadOptions(agentId: string) {
  return db
    .select({ id: leads.id, name: leads.name, phone: leads.phone })
    .from(leads)
    .where(eq(leads.agentId, agentId))
    .orderBy(desc(leads.lastActivityAt))
    .limit(300);
}
