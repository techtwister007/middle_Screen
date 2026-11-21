import Link from "next/link";
import { brand } from "@/config/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 p-6 text-center">
      <p className="font-display text-5xl font-extrabold text-stone-300">404</p>
      <p className="mt-3 font-semibold">This link doesn&apos;t exist or has been removed.</p>
      <p className="mt-1 text-sm text-stone-500">Ask the person who shared it for an updated link.</p>
      <Link href="/" className="mt-6 text-sm font-semibold text-brand-700">{brand.name}</Link>
    </div>
  );
}
