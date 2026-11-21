import QRCode from "qrcode";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { env } from "@/config/env";
import { requireAgent } from "@/lib/auth/session";
import { dateLabel } from "@/lib/format";
import { getAccess, planOptions, razorpayEnabled, upiUri } from "@/modules/billing";
import { Badge, Card, PageHeader } from "@/components/ui";
import { BillingClient } from "./BillingClient";

export const metadata = { title: "Plan & billing" };

export default async function Billing() {
  const agent = await requireAgent();
  const access = await getAccess(agent.id);
  const plans = planOptions();
  const qrs = Object.fromEntries(await Promise.all(plans.map(async (p) => [p.months, await QRCode.toDataURL(upiUri(p.amount, `Plan ${p.months}m ${agent.phone.slice(-4)}`), { width: 360, margin: 1 })])));
  const history = await db.select().from(payments).where(eq(payments.agentId, agent.id)).orderBy(desc(payments.createdAt)).limit(20);
  const stateText =
    access.state === "ok"
      ? access.status === "trial"
        ? `Free trial — ${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left`
        : `Active until ${dateLabel(access.periodEnd)}`
      : access.state === "grace"
        ? "Plan ended — grace period"
        : access.state === "locked"
          ? "Plan ended — paused"
          : "Plan ended";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Plan & billing" back="/app/more" />
      <Card className="p-5">
        <p className="text-sm font-medium text-stone-500">Current plan</p>
        <p className="mt-1 font-display text-xl font-bold">{stateText}</p>
        <p className="mt-1 text-sm text-stone-600">Everything included: unlimited properties, personal tracked links, collections, lead CRM, visit booking, WhatsApp assistant, alerts.</p>
      </Card>
      <BillingClient
        plans={plans}
        qrs={qrs}
        upiId={env.UPI_ID}
        upiName={env.UPI_NAME}
        razorpay={razorpayEnabled()}
        agent={{ name: agent.name, phone: agent.phone }}
      />
      {history.length ? (
        <Card className="p-4">
          <h2 className="mb-2 font-display font-bold">Payment history</h2>
          <div className="divide-y divide-stone-100">
            {history.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-semibold">₹{p.amountInr.toLocaleString("en-IN")} · {p.months} month{p.months > 1 ? "s" : ""}</p>
                  <p className="text-xs text-stone-500">{p.method.toUpperCase()} {p.reference ? `· ${p.reference}` : ""} · {dateLabel(p.createdAt)}</p>
                </div>
                <span className="flex items-center gap-2">
                  {p.status === "confirmed" ? <a href={`/receipt/${p.id}`} className="text-xs font-semibold text-brand-700">Receipt</a> : null}
                  <Badge tone={p.status === "confirmed" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status === "pending" && p.method === "upi" ? "Verifying" : p.status}</Badge>
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
