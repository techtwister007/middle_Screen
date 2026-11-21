import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { dateLabel } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Payment receipt" };

/** Printable / save-as-PDF receipt for a confirmed payment. */
export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const agent = await requireAgent();
  const { id } = await params;
  const p = await db.query.payments.findFirst({ where: and(eq(payments.id, id), eq(payments.agentId, agent.id), eq(payments.status, "confirmed")) });
  if (!p) notFound();
  return (
    <div className="min-h-screen bg-stone-100 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 ring-1 ring-stone-200 print:ring-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-2xl font-extrabold text-brand-800">{brand.company}</p>
            <p className="text-sm text-stone-500">{brand.name} · {brand.supportEmail}</p>
          </div>
          <p className="text-right text-sm"><b>RECEIPT</b><br />#{p.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-stone-500">Billed to</p><p className="font-semibold">{agent.company || agent.name}</p><p>{agent.name}</p><p>{formatPhone(agent.phone)}</p></div>
          <div className="text-right"><p className="text-stone-500">Date</p><p className="font-semibold">{dateLabel(p.confirmedAt ?? p.createdAt)}</p><p className="mt-2 text-stone-500">Paid via</p><p className="font-semibold">{p.method === "upi" ? "UPI" : p.method === "razorpay" ? "Razorpay" : "Manual"}{p.reference ? ` · ${p.reference}` : ""}</p></div>
        </div>
        <table className="mt-8 w-full text-sm">
          <thead><tr className="border-b border-stone-200 text-left text-stone-500"><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-stone-100"><td className="py-3">{brand.name} plan — {p.months} month{p.months > 1 ? "s" : ""}</td><td className="py-3 text-right">₹{p.amountInr.toLocaleString("en-IN")}</td></tr>
            <tr><td className="py-3 font-bold">Total paid</td><td className="py-3 text-right font-bold">₹{p.amountInr.toLocaleString("en-IN")}</td></tr>
          </tbody>
        </table>
        <p className="mt-8 text-xs text-stone-500">Thank you for your business. This is a computer-generated receipt from {env.UPI_NAME}.</p>
        <PrintButton />
      </div>
    </div>
  );
}
