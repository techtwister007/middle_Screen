"use client";

import { MessageCircle, Phone } from "lucide-react";
import { markAnsweredAction, markContactedAction } from "@/app/app/_actions/leads";

/** Call / WhatsApp that also record "contacted" so the lead leaves Needs-attention until they act again. */
export function ContactButtons({ leadId, phone, message }: { leadId: string; phone: string; message: string }) {
  const mark = () => {
    markContactedAction(leadId).catch(() => {});
  };
  return (
    <>
      <a href={`tel:+${phone}`} onClick={mark} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-stone-100 text-sm font-semibold"><Phone className="h-4 w-4" /> Call</a>
      <a href={`https://wa.me/${phone}?text=${encodeURIComponent(message)}`} onClick={mark} target="_blank" rel="noopener" className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
    </>
  );
}

export function ReplyToQuestion({ questionId, phone, question, title, answered }: { questionId: string; phone: string | null; question: string; title: string | null; answered: boolean }) {
  const text = `Regarding ${title ?? "the property"} — you asked: “${question}”\n\n`;
  if (answered) return <span className="text-xs font-semibold text-emerald-700">✓ Answered</span>;
  return (
    <span className="flex gap-3">
      {phone ? (
        <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener" onClick={() => markAnsweredAction(questionId)} className="text-xs font-semibold text-[#128C7E]">
          Reply on WhatsApp
        </a>
      ) : null}
      <button onClick={() => markAnsweredAction(questionId)} className="text-xs font-semibold text-stone-500">Mark answered</button>
    </span>
  );
}
