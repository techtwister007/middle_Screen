import Link from "next/link";
import { brand } from "@/config/brand";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link href="/" className="font-display font-extrabold text-brand-800">{brand.name}</Link>
        <h1 className="mt-6 font-display text-3xl font-extrabold">{title}</h1>
        <div className="prose-sm mt-6 space-y-4 text-[15px] leading-relaxed text-stone-700 [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc">{children}</div>
        <p className="mt-10 text-xs text-stone-400">{brand.name} is a product of {brand.company}. Contact: {brand.supportEmail}</p>
      </div>
    </div>
  );
}
