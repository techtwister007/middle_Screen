import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { brand } from "@/config/brand";
import { devTools } from "@/config/env";
import { adminLogoutAction } from "../_actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const nav = [
    ["/admin", "Dashboard"],
    ["/admin/agents", "Agents"],
    ["/admin/payments", "Payments"],
    ["/admin/listings", "Listings"],
    ["/admin/inbox", "Inbox"],
    ["/admin/broadcast", "Broadcast"],
    ...(devTools ? [["/admin/whatsapp", "WhatsApp simulator"]] : []),
  ];
  return (
    <div className="min-h-screen bg-stone-100">
      <header className="bg-stone-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 py-3">
          <span className="shrink-0 font-display font-extrabold">{brand.name} · Admin</span>
          <nav className="flex gap-1 text-sm">
            {nav.map(([h, l]) => (
              <Link key={h} href={h} className="shrink-0 rounded-lg px-2.5 py-1 text-white/80 hover:bg-white/10 hover:text-white">{l}</Link>
            ))}
          </nav>
          <form action={adminLogoutAction} className="ml-auto">
            <button className="text-sm text-white/60 hover:text-white">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
