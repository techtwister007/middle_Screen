import { ShieldCheck } from "lucide-react";

export const PROMISE_POINTS = [
  "We never contact your buyers for marketing, never sell or share their numbers, and never show them other agents' properties.",
  "Your property pages show only your name, phone and WhatsApp.",
  "Owner details, exact address and flat number are never shown unless you choose to.",
  "Your leads and notes are visible only to you — not to other agents or builders.",
  "In any future network, enquiries for your listing always go to you.",
];

export function AgentPromise({ compact }: { compact?: boolean }) {
  return (
    <div className="rounded-[20px] bg-brand-50 p-5">
      <p className="flex items-center gap-2 font-semibold text-brand-900">
        <ShieldCheck className="h-5 w-5" /> Your buyers are yours. Always.
      </p>
      <ol className={`mt-2 list-decimal space-y-1 pl-5 text-brand-900/85 ${compact ? "text-xs" : "text-sm"}`}>
        {PROMISE_POINTS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
    </div>
  );
}
