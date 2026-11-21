"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizePhone, waLink } from "@/lib/phone";
import { findOrCreateLead, getOwnLead } from "@/modules/leads";
import { getOwnListing, publishListing } from "@/modules/listings";
import { getOwnCollection } from "@/modules/collections";
import { collectionUrl, leadShare, listingUrl } from "@/modules/shares";
import { activeAgent, safe } from "./guard";

const Body = z.object({
  listingId: z.string().optional(),
  collectionId: z.string().optional(),
  leadId: z.string().optional(),
  name: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
});

/** Create (or reuse) a personal tracked link for one buyer + a ready-to-send WhatsApp message. */
export async function shareToLeadAction(raw: z.infer<typeof Body>) {
  return safe(async () => {
    const agent = await activeAgent();
    const b = Body.parse(raw);
    let lead = b.leadId ? await getOwnLead(agent.id, b.leadId) : null;
    if (!lead) {
      const phone = normalizePhone(b.phone);
      if (b.phone && !phone) throw new Error("That phone number doesn't look right");
      if (!b.name?.trim() && !phone) throw new Error("Add the buyer's name or number");
      lead = await findOrCreateLead(agent.id, { name: b.name, phone, source: "share" });
    }
    const first = (lead.name || "there").split(" ")[0];
    let url: string;
    let message: string;
    if (b.listingId) {
      const l = await getOwnListing(agent.id, b.listingId);
      if (!l) throw new Error("Property not found");
      if (l.status === "draft") await publishListing(agent.id, l.id);
      url = listingUrl((await leadShare(agent.id, { listingId: l.id }, lead.id)).code);
      message = `Hi ${first}! Sharing the details of ${l.title} — photos, price and location here:\n${url}`;
    } else if (b.collectionId) {
      const c = await getOwnCollection(agent.id, b.collectionId);
      if (!c) throw new Error("Collection not found");
      url = collectionUrl((await leadShare(agent.id, { collectionId: c.id }, lead.id)).code);
      message = `Hi ${first}! I've shortlisted ${c.listingIds.length} properties for you. Have a look, like the ones you prefer and I'll arrange visits:\n${url}`;
    } else throw new Error("Nothing to share");
    revalidatePath("/app/leads");
    return { url, message, leadId: lead.id, leadName: lead.name || lead.phone || "Buyer", waUrl: lead.phone ? waLink(lead.phone, message) : `https://wa.me/?text=${encodeURIComponent(message)}` };
  });
}
