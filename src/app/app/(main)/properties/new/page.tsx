import { MessageCircle, Sparkles } from "lucide-react";
import { aiEnabled } from "@/lib/ai/client";
import { waLink } from "@/lib/phone";
import { botNumber } from "@/lib/wa";
import { createFromTextAction } from "@/app/app/_actions/listings";
import { Card, PageHeader } from "@/components/ui";
import { NewListingForm } from "./NewListingForm";

export const metadata = { title: "Add property" };

export default function NewProperty() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add a property" subtitle="Describe it the way you'd tell a buyer. We'll organise everything." back="/app/properties" />
      <Card className="p-5">
        <NewListingForm action={createFromTextAction} voice={aiEnabled()} />
      </Card>
      <a href={waLink(botNumber(), "help")} target="_blank" rel="noopener" className="mt-4 flex items-center gap-3 rounded-2xl bg-[#25D366]/10 p-4 text-sm ring-1 ring-[#25D366]/30">
        <MessageCircle className="h-5 w-5 shrink-0 text-[#128C7E]" />
        <span>
          <b>Even faster on WhatsApp:</b> forward the owner&apos;s photos to our number, add a voice note, type <b>done</b>.
        </span>
      </a>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-stone-500">
        <Sparkles className="h-3.5 w-3.5" /> {aiEnabled() ? "AI fills the details — you always review before publishing." : "Details are extracted automatically — you always review before publishing."}
      </p>
    </div>
  );
}
