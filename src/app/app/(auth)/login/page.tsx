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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-stone-50 px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-extrabold tracking-tight text-brand-800">{brand.name}</p>
          <p className="mt-1 text-sm text-stone-500">by {brand.company}</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h1 className="font-display text-xl font-bold">Log in or sign up</h1>
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
