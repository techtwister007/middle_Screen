"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Users, LayoutGrid, Menu, CalendarDays, Bell, BarChart3, Settings, CreditCard, MessageCircle } from "lucide-react";
import clsx from "clsx";

const main = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/properties", label: "Properties", icon: Building2 },
  { href: "/app/leads", label: "Leads", icon: Users },
  { href: "/app/collections", label: "Collections", icon: LayoutGrid },
  { href: "/app/more", label: "More", icon: Menu },
];
const side = [
  ...main.slice(0, 4),
  { href: "/app/visits", label: "Site visits", icon: CalendarDays },
  { href: "/app/activity", label: "Activity", icon: Bell },
  { href: "/app/insights", label: "Insights", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/settings/billing", label: "Billing", icon: CreditCard },
];

function active(path: string, href: string, exact?: boolean) {
  return exact ? path === href : path === href || path.startsWith(href + "/");
}

export function BottomNav({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {main.map((i) => {
          const on = active(path, i.href, i.exact) || (i.href === "/app/more" && ["/app/visits", "/app/activity", "/app/insights", "/app/settings"].some((p) => path.startsWith(p)));
          return (
            <Link key={i.href} href={i.href} className={clsx("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", on ? "text-brand-700" : "text-stone-500")}>
              <i.icon className="h-5 w-5" />
              {i.label}
              {i.href === "/app/more" && unread > 0 ? <span className="absolute right-[30%] top-1.5 h-2 w-2 rounded-full bg-rose-500" /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav({ unread, botUrl }: { unread: number; botUrl: string }) {
  const path = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-20 space-y-1">
        {side.map((i) => {
          const on = i.href === "/app/settings" ? path === "/app/settings" : active(path, i.href, i.exact);
          return (
            <Link key={i.href} href={i.href} className={clsx("flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold", on ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-100")}>
              <i.icon className="h-[18px] w-[18px]" /> {i.label}
              {i.href === "/app/activity" && unread > 0 ? <span className="ml-auto rounded-full bg-rose-500 px-1.5 text-[11px] text-white">{unread}</span> : null}
            </Link>
          );
        })}
        <a href={botUrl} target="_blank" rel="noopener" className="mt-4 flex items-center gap-3 rounded-xl bg-[#25D366]/10 px-3 py-2 text-sm font-semibold text-[#128C7E]">
          <MessageCircle className="h-[18px] w-[18px]" /> Open WhatsApp bot
        </a>
      </div>
    </aside>
  );
}
