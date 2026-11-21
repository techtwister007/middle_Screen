import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, isNull } from "drizzle-orm";
import { Bell } from "lucide-react";
import { brand } from "@/config/brand";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAgent } from "@/lib/auth/session";
import { waLink } from "@/lib/phone";
import { botNumber } from "@/lib/wa";
import { getAccess } from "@/modules/billing";
import { BottomNav, SideNav } from "@/components/app/Nav";
import { Avatar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const agent = await requireAgent();
  if (!agent.onboarded) redirect("/app/welcome");
  const access = await getAccess(agent.id);
  const [{ n: unread }] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.agentId, agent.id), isNull(notifications.readAt)));
  const botUrl = waLink(botNumber(), "help");

  return (
    <div className="min-h-screen bg-stone-50 pb-24 lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/app" className="font-display text-lg font-extrabold tracking-tight text-brand-800">
            {brand.name}
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/app/activity" aria-label="Activity" className="relative rounded-full p-2 text-stone-600 hover:bg-stone-100">
              <Bell className="h-5 w-5" />
              {unread > 0 ? <span className="absolute right-1 top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 9 ? "9+" : unread}</span> : null}
            </Link>
            <Link href="/app/settings" aria-label="Settings">
              <Avatar name={agent.name || "A"} src={agent.photoUrl} size={32} />
            </Link>
          </div>
        </div>
      </header>
      {access.state !== "ok" || (access.status === "trial" && access.daysLeft <= 7) ? (
        <div className={access.state === "ok" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>
              {access.state === "ok"
                ? `Free trial: ${access.daysLeft} day${access.daysLeft === 1 ? "" : "s"} left.`
                : access.state === "grace"
                  ? "Your plan has ended — you're in a short grace period. Renew to avoid interruption."
                  : "Your plan has ended. New listings, alerts and tracking are paused. Your links still work for a while."}
            </span>
            <Link href="/app/settings/billing" className="shrink-0 font-bold underline">
              {access.state === "ok" ? "Upgrade" : "Renew now"}
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-6xl gap-8 px-4 pt-5">
        <SideNav unread={unread} botUrl={botUrl} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav unread={unread} />
    </div>
  );
}
