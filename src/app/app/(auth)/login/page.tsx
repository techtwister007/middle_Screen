import { redirect } from "next/navigation";
import { brand } from "@/config/brand";
import { devTools } from "@/config/env";
import { currentAgent } from "@/lib/auth/session";
import { LoginClient } from "./LoginClient";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string; next?: string }> }) {
  const sp = await searchParams;
  const a = await currentAgent();
  if (a) redirect(sp.next?.startsWith("/app") ? sp.next : "/app");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-5 py-10">
      <div className="stagger w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <svg viewBox="0 0 64 64" className="h-16 w-16 [animation:mark-in_.6s_cubic-bezier(.22,1,.36,1)_backwards]" aria-hidden>
            <rect width="64" height="64" rx="18" fill="#1f4d36" />
            <path d="M16 33 32 19l16 14v14H38V37H26v10H16Z" fill="#fff" />
          </svg>
          <p className="mt-4 text-[28px] font-semibold tracking-tight">{brand.name}</p>
          <p className="mt-0.5 text-sm text-stone-500">{brand.tagline}</p>
        </div>
        <div className="rounded-[24px] bg-white p-6 shadow-card">
          <h1 className="text-xl font-semibold">Log in or sign up</h1>
          <p className="mt-1 text-sm text-stone-500">No passwords. Just send one WhatsApp message from your business number.</p>
          {sp.expired ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">That login link has expired. Log in again below.</p> : null}
          <LoginClient devTools={devTools} next={sp.next?.startsWith("/app") ? sp.next : "/app"} />
        </div>
        <p className="mt-6 text-center text-xs text-stone-500">
          By continuing you agree to the <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
