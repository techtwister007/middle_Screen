"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Users, LayoutGrid, Menu, CalendarDays, Bell, BarChart3, Settings, CreditCard, MessageCircle } from "lucide-react";
import clsx from "clsx";

const main = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/properties", label: "Properties", icon: Building2 },
  { href: "/app/leads", label: "Buyers", icon: Users },
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
  const idx = main.findIndex((i) => active(path, i.href, i.exact) || (i.href === "/app/more" && ["/app/visits", "/app/activity", "/app/insights", "/app/settings", "/app/more"].some((p) => path.startsWith(p))));
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-30 lg:hidden">
      <div className="relative mx-auto grid max-w-lg grid-cols-5 rounded-[22px] bg-white p-1.5 shadow-float">
        {idx >= 0 ? (
          <span
            aria-hidden
            className="absolute bottom-1.5 top-1.5 rounded-2xl bg-brand-50 transition-[left] duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
            style={{ width: `calc((100% - 12px) / 5)`, left: `calc(6px + ${idx} * (100% - 12px) / 5)` }}
          />
        ) : null}
        {main.map((i, n) => {
          const on = n === idx;
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={clsx("press relative flex h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl text-[11.5px] font-semibold", on ? "text-brand-800" : "text-stone-500")}>
              <i.icon className="h-[21px] w-[21px]" strokeWidth={on ? 2.1 : 1.8} />
              {i.label}
              {i.href === "/app/more" && unread > 0 ? <span className="absolute right-[26%] top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" /> : null}
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
            <Link key={i.href} href={i.href} className={clsx("press flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-semibold", on ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-100")}>
              <i.icon className="h-[18px] w-[18px]" /> {i.label}
              {i.href === "/app/activity" && unread > 0 ? <span className="ml-auto rounded-full bg-rose-500 px-1.5 text-[11px] text-white">{unread}</span> : null}
            </Link>
          );
        })}
        <a href={botUrl} target="_blank" rel="noopener" className="press mt-4 flex items-center gap-3 rounded-2xl bg-brand-700 px-3 py-2.5 text-[15px] font-semibold text-white">
          <MessageCircle className="h-[18px] w-[18px]" /> Open WhatsApp bot
        </a>
      </div>
    </aside>
  );
}
