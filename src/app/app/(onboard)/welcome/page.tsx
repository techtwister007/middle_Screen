import { redirect } from "next/navigation";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { requireAgent } from "@/lib/auth/session";
import { completeOnboardingAction } from "@/app/app/_actions/misc";
import { Button, Card, Field, Input } from "@/components/ui";
import { AgentPromise } from "@/components/AgentPromise";

export const metadata = { title: "Welcome" };

export default async function Welcome() {
  const agent = await requireAgent();
  if (agent.onboarded) redirect("/app");
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-stone-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <p className="font-display text-2xl font-extrabold text-brand-800">{brand.name}</p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">Welcome! Let&apos;s set you up.</h1>
        <p className="mt-1 text-stone-600">Takes 30 seconds. Your {env.TRIAL_DAYS}-day free trial starts now.</p>
        <Card className="mt-6 p-5">
          <form action={completeOnboardingAction} className="space-y-4">
            <Field label="Your name">
              <Input name="name" required defaultValue={agent.name} placeholder="e.g. Rakesh Sharma" />
            </Field>
            <Field label="Company / brokerage (optional)">
              <Input name="company" defaultValue={agent.company ?? ""} placeholder="e.g. Sharma Properties" />
            </Field>
            <Field label="City">
              <Input name="city" defaultValue={agent.city ?? ""} placeholder="e.g. Vadodara" />
            </Field>
            <AgentPromise compact />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="promise" required className="mt-0.5 h-4 w-4 accent-brand-700" /> I accept the Agent Promise and the <a href="/terms" className="underline">Terms</a>.
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="network" defaultChecked className="mt-0.5 h-4 w-4 accent-brand-700" />
              <span>
                Include my public listings in the future {brand.name} property network. Enquiries always come to me; I can mark any listing private.
              </span>
            </label>
            <Button type="submit" size="lg" className="w-full">Start my free trial</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
