import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, type BotContext } from "@/db/schema";
import { id } from "@/lib/ids";
import { slugify } from "@/lib/format";
import { startTrial } from "./billing";

/** Handles that would collide with app routes. */
export const RESERVED_HANDLES = new Set([
  "app", "admin", "api", "p", "c", "media", "login", "logout", "privacy", "terms", "pricing", "about", "help", "support", "static",
  "_next", "favicon", "robots", "sitemap", "manifest", "sw", "icon", "data", "report", "promise", "verify", "new", "dev",
]);

export async function uniqueHandle(base: string, excludeAgentId?: string): Promise<string> {
  let root = slugify(base) || "agent";
  if (RESERVED_HANDLES.has(root) || root.length < 3) root = `${root}-homes`;
  for (let i = 0; i < 50; i++) {
    const h = i === 0 ? root : `${root}-${i + 1}`;
    const ex = await db.query.agents.findFirst({ where: eq(agents.handle, h), columns: { id: true } });
    if (!ex || ex.id === excludeAgentId) return h;
  }
  return `${root}-${id().slice(0, 4)}`;
}

export async function getAgentByPhone(phone: string) {
  return db.query.agents.findFirst({ where: eq(agents.phone, phone) });
}

export async function getAgentByHandle(handle: string) {
  return db.query.agents.findFirst({ where: eq(agents.handle, handle.toLowerCase()) });
}

/** Creates an agent (first WhatsApp "hi" or web signup) and starts the free trial. */
export async function createAgent(phone: string, name = "") {
  const aid = id();
  const handle = await uniqueHandle(name || `agent-${phone.slice(-4)}`);
  const [a] = await db
    .insert(agents)
    .values({ id: aid, phone, name, handle, botContext: { onboarding: "name" } })
    .onConflictDoNothing()
    .returning();
  if (!a) return (await getAgentByPhone(phone))!;
  await startTrial(aid);
  return a;
}

export async function setBotContext(agentId: string, ctx: BotContext) {
  await db.update(agents).set({ botContext: ctx }).where(eq(agents.id, agentId));
}

export function agentDisplayName(a: { name: string; company: string | null }) {
  return a.company?.trim() || a.name.trim() || "Your property consultant";
}
