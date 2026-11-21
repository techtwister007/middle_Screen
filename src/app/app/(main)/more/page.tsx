import Link from "next/link";
import { CalendarDays, Bell, BarChart3, Settings, CreditCard, MessageCircle, ShieldCheck, Download, LifeBuoy, LogOut, Globe, Sparkles } from "lucide-react";
import { requireAgent } from "@/lib/auth/session";
import { waLink } from "@/lib/phone";
import { botNumber } from "@/lib/wa";
import { Card } from "@/components/ui";
import { FeedbackBox } from "@/components/app/FeedbackBox";

export const metadata = { title: "More" };

export default async function More() {
  const agent = await requireAgent();
  const items = [
    { href: "/app/visits", label: "Site visits", icon: CalendarDays },
    { href: "/app/activity", label: "Activity", icon: Bell },
    { href: "/app/insights", label: "Insights", icon: BarChart3 },
    { href: "/app/greetings", label: "Festival greeting cards", icon: Sparkles },
    { href: `/${agent.handle}`, label: "My agent website", icon: Globe },
    { href: "/app/settings", label: "Profile & branding", icon: Settings },
    { href: "/app/settings/billing", label: "Plan & billing", icon: CreditCard },
    { href: "/api/export/leads", label: "Export my leads (CSV)", icon: Download },
    { href: "/promise", label: "Our promise to you", icon: ShieldCheck },
  ];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">More</h1>
      <Card className="divide-y divide-stone-100">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="flex items-center gap-3 p-4 font-medium hover:bg-stone-50">
            <i.icon className="h-5 w-5 text-stone-500" /> {i.label}
          </Link>
        ))}
        <a href={waLink(botNumber(), "help")} target="_blank" rel="noopener" className="flex items-center gap-3 p-4 font-medium text-brand-700 hover:bg-stone-50">
          <MessageCircle className="h-5 w-5" /> Open WhatsApp assistant
        </a>
      </Card>
      <Card className="p-4 text-sm text-stone-600">
        <p className="mb-1 font-semibold text-stone-800">Install the app on your phone</p>
        <p><b>Android:</b> Chrome menu ⋮ → <i>Add to Home screen</i>. <b>iPhone:</b> Safari Share → <i>Add to Home Screen</i> (needed for alerts on iPhone).</p>
      </Card>
      <Card className="p-4">
        <p className="mb-2 flex items-center gap-2 font-semibold"><LifeBuoy className="h-4 w-4" /> Feedback & help</p>
        <FeedbackBox />
      </Card>
      <form action="/app/logout" method="post">
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-red-600 ring-1 ring-stone-200">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </form>
    </div>
  );
}
