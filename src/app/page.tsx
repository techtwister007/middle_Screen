import Link from "next/link";
import { MessageCircle, Eye, Heart, CalendarCheck, LayoutGrid, ShieldCheck, Bell, Sparkles } from "lucide-react";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { waLink } from "@/lib/phone";
import { botNumber } from "@/lib/wa";
import { AgentPromise } from "@/components/AgentPromise";

export default function Landing() {
  const features = [
    { icon: MessageCircle, t: "Works from WhatsApp", d: "Forward photos, add a voice note, type done. A beautiful page in about a minute." },
    { icon: Eye, t: "Know who opened it", d: "Personal links show exactly which buyer opened your property — and how many times." },
    { icon: Heart, t: "See what they like", d: "Buyers save, like, rank and compare. You see their favourites instantly." },
    { icon: CalendarCheck, t: "Site visits, booked", d: "Buyers request a visit in two taps. You confirm in one." },
    { icon: LayoutGrid, t: "One link, many homes", d: "Shortlist 5 properties for a buyer and send one beautiful link." },
    { icon: Bell, t: "Alerts that matter", d: "“Rahul saved the Gotri flat — call now.” No noise, only hot moments." },
  ];
  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-xl font-extrabold text-brand-800">{brand.name}</span>
        <div className="flex items-center gap-3">
          <Link href="/app/login" className="text-sm font-semibold text-stone-700">Log in</Link>
          <Link href="/app/login" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Start free</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 text-center sm:pt-16">
        <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800"><Sparkles className="h-4 w-4" /> For real estate agents & brokers</p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-stone-900 sm:text-6xl">
          Stop sending 20 photos. <span className="text-brand-700">Send one link</span> — and know who&apos;s ready to visit.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-stone-600">{brand.description}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={waLink(botNumber(), "hi")} className="flex h-12 items-center gap-2 rounded-xl bg-[#1f8f4e] px-6 font-bold text-white shadow-sm">
            <MessageCircle className="h-5 w-5" /> Start on WhatsApp
          </a>
          <Link href="/app/login" className="flex h-12 items-center rounded-xl bg-brand-700 px-6 font-bold text-white">Sign up on the web</Link>
        </div>
        <p className="mt-3 text-sm text-stone-500">{env.TRIAL_DAYS}-day free trial · then ₹{env.PLAN_PRICE_INR}/month · no card needed</p>
      </section>
      <section className="bg-stone-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="rounded-3xl bg-white p-6 ring-1 ring-stone-200">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><f.icon className="h-5 w-5" /></span>
              <p className="mt-4 font-display text-lg font-bold">{f.t}</p>
              <p className="mt-1 text-stone-600">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="mb-5 flex items-center justify-center gap-2 text-center font-display text-3xl font-extrabold"><ShieldCheck className="h-7 w-7 text-brand-700" /> Our promise to agents</h2>
        <AgentPromise />
      </section>
      <section className="bg-brand-800 py-14 text-center text-white">
        <h2 className="font-display text-3xl font-extrabold">Your next deal starts with a link.</h2>
        <a href={waLink(botNumber(), "hi")} className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-bold text-brand-800">
          <MessageCircle className="h-5 w-5" /> Say hi on WhatsApp
        </a>
      </section>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-stone-500">
        <span>© {new Date().getFullYear()} {brand.name} · a <a href={brand.companyUrl} className="underline">{brand.company}</a> product</span>
        <span className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/data">Your data</Link><a href={`mailto:${brand.supportEmail}`}>Contact</a></span>
      </footer>
    </div>
  );
}
