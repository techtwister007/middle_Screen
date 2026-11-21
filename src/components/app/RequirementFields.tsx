import type { Requirement } from "@/db/schema";
import { inr } from "@/lib/format";

const input = "block w-full rounded-xl px-3.5 py-2.5 text-[15px] ring-1 ring-stone-300 outline-none focus:ring-2 focus:ring-brand-600 bg-white";

/** Buyer requirement inputs (server-rendered form fields). */
export function RequirementFields({ r = {} }: { r?: Requirement }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm">
        <span className="mb-1 block font-medium text-stone-700">Looking to</span>
        <select name="purpose" defaultValue={r.purpose ?? ""} className={input}>
          <option value="">Any</option>
          <option value="sale">Buy</option>
          <option value="rent">Rent</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-stone-700">Type</span>
        <select name="type" defaultValue={r.type ?? ""} className={input}>
          <option value="">Any</option>
          <option value="flat">Flat</option>
          <option value="house">House / Villa</option>
          <option value="plot">Plot</option>
          <option value="commercial">Shop / Office</option>
          <option value="pg">PG</option>
        </select>
      </label>
      <fieldset className="col-span-2 text-sm">
        <legend className="mb-1 font-medium text-stone-700">BHK</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((b) => (
            <label key={b} className="flex items-center gap-1.5 rounded-xl px-3 py-2 ring-1 ring-stone-200 has-[:checked]:bg-brand-50 has-[:checked]:ring-brand-500">
              <input type="checkbox" name="bhk" value={b} defaultChecked={r.bhk?.includes(b)} className="accent-brand-700" /> {b}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-stone-700">Budget from</span>
        <input name="budgetMin" defaultValue={r.budgetMin ? inr(r.budgetMin).replace("₹", "").replace(" ", "") : ""} placeholder="e.g. 60L" className={input} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-stone-700">Budget up to</span>
        <input name="budgetMax" defaultValue={r.budgetMax ? inr(r.budgetMax).replace("₹", "").replace(" ", "") : ""} placeholder="e.g. 1cr" className={input} />
      </label>
      <label className="col-span-2 text-sm">
        <span className="mb-1 block font-medium text-stone-700">Preferred areas</span>
        <input name="localities" defaultValue={r.localities?.join(", ") ?? ""} placeholder="e.g. Gotri, Vasna, Alkapuri" className={input} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-stone-700">Timeline</span>
        <input name="timeline" defaultValue={r.timeline ?? ""} placeholder="e.g. within 3 months" className={input} />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-stone-700">Other notes</span>
        <input name="reqNotes" defaultValue={r.notes ?? ""} placeholder="e.g. needs 2 parking" className={input} />
      </label>
    </div>
  );
}

export function requirementSummary(r: Requirement): string {
  const parts: string[] = [];
  if (r.purpose) parts.push(r.purpose === "rent" ? "Rent" : "Buy");
  if (r.bhk?.length) parts.push(`${r.bhk.join("/")} BHK`);
  if (r.type) parts.push(r.type);
  if (r.budgetMin || r.budgetMax) parts.push(`${r.budgetMin ? inr(r.budgetMin) : "…"} – ${r.budgetMax ? inr(r.budgetMax) : "…"}`);
  if (r.localities?.length) parts.push(r.localities.join(", "));
  if (r.timeline) parts.push(r.timeline);
  return parts.join(" · ");
}
