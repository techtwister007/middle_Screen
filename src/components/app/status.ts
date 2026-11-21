import type { ListingStatus } from "@/db/schema";

export const statusTone: Record<ListingStatus, "green" | "amber" | "stone" | "blue" | "red"> = { available: "green", on_hold: "amber", draft: "blue", sold: "stone", rented: "stone", archived: "red" };
export const statusText: Record<ListingStatus, string> = { available: "Available", on_hold: "On hold", draft: "Draft", sold: "Sold", rented: "Rented", archived: "Archived" };
