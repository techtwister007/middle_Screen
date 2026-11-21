import Link from "next/link";
import { MessageCircle, Eye, Heart, CalendarCheck, LayoutGrid, Bell, MapPin, Share2, Check, ImageIcon } from "lucide-react";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { waLink } from "@/lib/phone";
import { botNumber } from "@/lib/wa";
import { AgentPromise } from "@/components/AgentPromise";

const Mark = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden>
    <rect width="64" height="64" rx="18" fill="#1f4d36" />
    <path d="M16 33 32 19l16 14v14H38V37H26v10H16Z" fill="#fff" />
  </svg>
);

/** A real-looking buyer page inside a phone, with the alerts an agent would get. */
function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="rounded-[44px] bg-[#0f1411] p-2.5 shadow-[0_40px_80px_-30px_rgba(28,38,32,.45)] [animation:rise_.7s_.1s_cubic-bezier(.22,1,.36,1)_backwards]">
        <div className="overflow-hidden rounded-[36px] bg-[#f6f2ea] text-left text-[#1c2620]">
          <div className="relative h-[230px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/home.webp" alt="" className="h-full w-full object-cover" />
            <span className="absolute left-3 top-3 flex h-8 items-center gap-1.5 rounded-full bg-[#ffffff]/95 pl-1 pr-3 text-[12px] font-semibold shadow">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f4d36] text-[10px] text-white">SP</span>Sharma Properties
            </span>
          </div>
          <div className="relative z-10 -mt-6 mx-2.5 rounded-[20px] bg-[#ffffff] p-4 shadow-[0_6px_18px_rgba(28,38,32,.08)]">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ecf4ee] px-2 py-0.5 text-[11px] font-semibold text-[#1f4d36]"><span className="h-1.5 w-1.5 rounded-full bg-current" />Available</span>
            <p className="mt-1.5 text-[17px] font-semibold leading-tight">3 BHK flat in Gotri</p>
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#66716a]"><MapPin className="h-3 w-3" />Gotri, Vadodara</p>
            <p className="mt-2 text-[24px] font-bold tracking-tight text-[#1f4d36]">₹95 L</p>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
              {[["3 BHK", "Type"], ["1,450", "Sq ft"], ["Furnished", "Status"]].map(([a, b]) => (
                <div key={a} className="rounded-xl bg-[#eee9df] py-1.5"><p className="text-[12px] font-semibold">{a}</p><p className="text-[10px] text-[#66716a]">{b}</p></div>
              ))}
            </div>
          </div>
          <div className="m-2.5 grid grid-cols-[auto_1fr] gap-1.5 rounded-[18px] bg-[#ffffff] p-1.5 shadow-[0_6px_18px_rgba(28,38,32,.08)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f8f4e] text-white"><MessageCircle className="h-4 w-4" /></span>
            <span className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1f4d36] text-[13px] font-semibold text-white"><CalendarCheck className="h-4 w-4" />Book site visit</span>
          </div>
        </div>
      </div>
      <div className="absolute left-1 top-28 w-[220px] rounded-2xl bg-[#ffffff] p-3 text-left shadow-[0_14px_32px_rgba(28,38,32,.16)] [animation:rise_.6s_.7s_cubic-bezier(.22,1,.36,1)_backwards] sm:-left-24 sm:top-24">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1c2620]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ecf4ee] text-[#1f4d36]"><Eye className="h-3.5 w-3.5" /></span>Priya opened your link</p>
        <p className="mt-1 pl-9 text-[12px] text-[#66716a]">3rd time today · saw all photos</p>
      </div>
      <div className="absolute right-1 bottom-24 w-[200px] rounded-2xl bg-[#ffffff] p-3 text-left shadow-[0_14px_32px_rgba(28,38,32,.16)] [animation:rise_.6s_1.1s_cubic-bezier(.22,1,.36,1)_backwards] sm:-right-20 sm:bottom-28">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1c2620]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fbecd2] text-[#9a5a00]"><CalendarCheck className="h-3.5 w-3.5" /></span>Visit requested</p>
        <p className="mt-1 pl-9 text-[12px] text-[#66716a]">Sat 23 Nov, evening</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const steps = [
    { icon: MessageCircle, t: "Forward photos on WhatsApp", d: "Send photos and a voice note to our number, then type done. We write the listing and you check it." },
    { icon: Share2, t: "Send one personal link", d: "Each buyer gets their own link with your name, photo and colour. No more 20 photos in a chat." },
    { icon: Bell, t: "See who is ready to visit", d: "Know who opened it, what they liked, and who asked for a visit, so you call the right buyer first." },
  ];
  const features = [
    { icon: Eye, t: "Who opened it, and how often" },
    { icon: Heart, t: "What each buyer liked, saved and ranked" },
    { icon: CalendarCheck, t: "Site visits requested in two taps" },
    { icon: LayoutGrid, t: "Shortlists: many homes, one link" },
    { icon: MapPin, t: "Nearby schools, hospitals and commute times" },
    { icon: ImageIcon, t: "WhatsApp Status images in your colours" },
  ];
  return (
    <div className="bg-stone-50 text-stone-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 text-[19px] font-semibold tracking-tight"><Mark /> {brand.name}</span>
        <div className="flex items-center gap-2">
          <Link href="/app/login" className="press rounded-[14px] px-3 py-2 text-sm font-semibold text-stone-700">Log in</Link>
          <Link href="/app/login" className="press rounded-[14px] bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white">Start free</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-14">
        <div className="stagger">
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-tight text-balance sm:text-[56px]">
            Send one link. Know which buyer is ready to visit.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
            {brand.name} turns the photos you forward on WhatsApp into a beautiful property page with your name on it, then shows you exactly who opened it, what they liked and who wants a site visit.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={waLink(botNumber(), "hi")} className="press flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[#1f8f4e] px-6 font-semibold text-white">
              <MessageCircle className="h-5 w-5" /> Start on WhatsApp
            </a>
            <Link href="/app/login" className="press flex h-[52px] items-center justify-center rounded-[14px] bg-white px-6 font-semibold text-stone-900 shadow-card">Sign up on the web</Link>
          </div>
          <p className="mt-4 text-sm text-stone-500">{env.TRIAL_DAYS}-day free trial, then ₹{env.PLAN_PRICE_INR} a month. No card needed.</p>
        </div>
        <ProductPreview />
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-[30px] font-semibold tracking-tight">How it works</h2>
          <ol className="stagger mt-8 grid gap-8 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.t}>
                <span className="flex items-center gap-3">
                  <span className="tnum flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">{i + 1}</span>
                  <s.icon className="h-5 w-5 text-brand-700" />
                </span>
                <p className="mt-4 text-lg font-semibold">{s.t}</p>
                <p className="mt-1.5 leading-relaxed text-stone-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-[30px] font-semibold leading-tight tracking-tight">Everything you need to close faster, nothing you need to learn</h2>
          <ul className="mt-6 space-y-3">
            {features.map((f) => (
              <li key={f.t} className="flex items-center gap-3 text-[16px]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><f.icon className="h-5 w-5" /></span>
                {f.t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[28px] bg-white p-7 shadow-card">
          <p className="text-sm font-semibold text-brand-700">Simple pricing</p>
          <p className="tnum mt-2 text-[44px] font-bold leading-none tracking-tight">₹{env.PLAN_PRICE_INR}<span className="text-lg font-medium text-stone-500"> / month</span></p>
          <p className="mt-2 text-stone-600">First {env.TRIAL_DAYS} days free. Pay by UPI or card. Cancel any time.</p>
          <ul className="mt-5 space-y-2.5 text-[15px]">
            {["Unlimited properties and links", "Buyer tracking and visit booking", "Your own website with all listings", "Works fully from WhatsApp"].map((x) => (
              <li key={x} className="flex items-center gap-2.5"><Check className="h-4 w-4 text-brand-700" />{x}</li>
            ))}
          </ul>
          <Link href="/app/login" className="press mt-6 flex h-[52px] items-center justify-center rounded-[14px] bg-brand-700 font-semibold text-white">Start your free trial</Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <h2 className="mb-5 text-center text-[30px] font-semibold tracking-tight">Our promise to agents</h2>
        <AgentPromise />
      </section>

      <section className="px-4 pb-10">
        <div className="mx-auto max-w-6xl rounded-[32px] px-6 py-14 text-center text-white [background:#1f4d36]">
          <h2 className="text-[30px] font-semibold tracking-tight">Your next deal starts with a link.</h2>
          <a href={waLink(botNumber(), "hi")} className="press mt-6 inline-flex h-[52px] items-center gap-2 rounded-[14px] bg-white px-6 font-semibold text-[#1f4d36]">
            <MessageCircle className="h-5 w-5" /> Say hi on WhatsApp
          </a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-stone-500">
        <span>© {new Date().getFullYear()} {brand.name} · a <a href={brand.companyUrl} className="underline underline-offset-2">{brand.company}</a> product</span>
        <span className="flex gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/data">Your data</Link><a href={`mailto:${brand.supportEmail}`}>Contact</a></span>
      </footer>
    </div>
  );
}
