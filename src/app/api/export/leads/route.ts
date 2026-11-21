import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { currentAgent } from "@/lib/auth/session";
import { requirementSummary } from "@/components/app/RequirementFields";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Agents own their leads — they can export them any time. */
export async function GET() {
  const agent = await currentAgent();
  if (!agent) return new Response("Unauthorized", { status: 401 });
  const rows = await db.select().from(leads).where(eq(leads.agentId, agent.id)).orderBy(desc(leads.createdAt));
  const header = ["Name", "Phone", "Verified", "Stage", "Intent score", "Requirement", "Next follow-up", "Source", "Created"];
  const lines = rows.map((l) => [l.name, l.phone ? `+${l.phone}` : "", l.phoneVerified ? "yes" : "no", l.stage, l.intentScore, requirementSummary(l.requirement), l.nextFollowUpAt?.toISOString() ?? "", l.source, l.createdAt.toISOString()].map(esc).join(","));
  return new Response([header.join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
