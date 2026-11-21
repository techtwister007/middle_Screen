import Link from "next/link";

export function AgentSiteFilters({ handle, purpose, bhk }: { handle: string; purpose?: string; bhk?: string }) {
  const q = (p: Record<string, string | undefined>) => {
    const s = new URLSearchParams(Object.entries({ purpose, bhk, ...p }).filter(([, v]) => v) as [string, string][]).toString();
    return `/${handle}${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => `shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ${on ? "bg-agent text-white ring-transparent" : "bg-white text-stone-700 ring-stone-200"}`;
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      <Link href={q({ purpose: undefined })} className={chip(!purpose)}>All</Link>
      <Link href={q({ purpose: "sale" })} className={chip(purpose === "sale")}>Buy</Link>
      <Link href={q({ purpose: "rent" })} className={chip(purpose === "rent")}>Rent</Link>
      <span className="mx-1 w-px shrink-0 bg-stone-200" />
      {["1", "2", "3", "4"].map((b) => (
        <Link key={b} href={q({ bhk: bhk === b ? undefined : b })} className={chip(bhk === b)}>
          {b} BHK
        </Link>
      ))}
    </div>
  );
}
