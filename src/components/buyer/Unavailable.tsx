import { Phone, MessageCircle } from "lucide-react";
import type { PublicAgent } from "@/modules/public";
import { brand } from "@/config/brand";

export function Unavailable({ agent, message }: { agent?: PublicAgent; message: string }) {
  return (
    <div style={{ ["--agent" as string]: agent?.brandColor ?? "#0f766e" }} className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center ring-1 ring-stone-200">
        {agent ? (
          <>
            {agent.photoUrl || agent.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(agent.logoUrl ?? agent.photoUrl)!} alt="" className="mx-auto mb-3 h-16 w-16 rounded-full object-cover" />
            ) : null}
            <p className="font-display text-xl font-bold">{agent.displayName}</p>
          </>
        ) : null}
        <p className="mt-2 text-stone-600">{message}</p>
        {agent ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a href={`tel:+${agent.phone}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-100 font-semibold">
              <Phone className="h-4 w-4" /> Call
            </a>
            <a href={`https://wa.me/${agent.phone}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1f8f4e] font-semibold text-white">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        ) : null}
        <p className="mt-6 text-xs text-stone-400">Powered by {brand.name}</p>
      </div>
    </div>
  );
}
