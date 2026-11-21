"use client";

import { useActionState } from "react";
import { adminLoginAction } from "../_actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, null as { error?: string } | null);
  return (
    <form action={action} className="space-y-3">
      <input type="password" name="password" placeholder="Admin password" aria-label="Admin password" required className="block w-full rounded-xl px-3.5 py-2.5 ring-1 ring-stone-300" />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <button disabled={pending} className="h-11 w-full rounded-xl bg-stone-900 font-semibold text-white">Log in</button>
    </form>
  );
}
