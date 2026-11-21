import { notFound } from "next/navigation";
import { devTools, env } from "@/config/env";
import { Simulator } from "./Simulator";

export default function WhatsAppSim() {
  if (!devTools) notFound();
  return (
    <div className="space-y-3">
      <h1 className="font-display text-2xl font-bold">WhatsApp simulator</h1>
      <p className="text-sm text-stone-500">Chat with the bot as any phone number — exactly what agents see on WhatsApp. Provider: <b>{env.WA_PROVIDER}</b>. (Disabled when DEV_TOOLS=false.)</p>
      <Simulator />
    </div>
  );
}
