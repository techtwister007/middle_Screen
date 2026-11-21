import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export { clsx as cx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp" | "agent";
const variants: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
  secondary: "bg-white text-stone-800 ring-1 ring-stone-200 hover:bg-stone-100",
  ghost: "text-stone-700 hover:bg-stone-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  whatsapp: "bg-[#1f8f4e] text-white hover:bg-[#1a7d44]",
  agent: "bg-agent text-white hover:opacity-90",
};
const sizes = { sm: "h-9 px-3.5 text-sm", md: "h-11 px-4 text-[15px]", lg: "h-[52px] px-5 text-base" };
const base = "press inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function Button({ variant = "primary", size = "md", className, ...p }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={clsx(base, variants[variant], sizes[size], className)} {...p} />;
}

export function LinkButton({ variant = "primary", size = "md", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={clsx(base, variants[variant], sizes[size], className)} {...p} />;
}

export function A({ variant = "primary", size = "md", className, ...p }: ComponentProps<"a"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <a className={clsx(base, variants[variant], sizes[size], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={clsx("rounded-[20px] bg-white shadow-card", className)} {...p} />;
}

export function Label({ className, ...p }: ComponentProps<"label">) {
  return <label className={clsx("mb-1.5 block text-sm font-medium text-stone-700", className)} {...p} />;
}

const inputCls =
  "block w-full rounded-[14px] border-0 bg-white px-3.5 py-3 text-[15px] text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-500 focus:ring-2 focus:ring-brand-600 outline-none transition-shadow";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={clsx(inputCls, className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={clsx(inputCls, "min-h-24", className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={clsx(inputCls, "pr-8", className)} {...p} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

const badgeTones = {
  stone: "bg-stone-100 text-stone-700",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  brand: "bg-brand-50 text-brand-800 ring-1 ring-brand-100",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
};
export function Badge({ tone = "stone", className, ...p }: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", badgeTones[tone], className)} {...p} />;
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: string }) {
  return (
    <div className="page-enter mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {back ? (
          <Link href={back} className="mb-1 inline-block text-sm font-medium text-stone-500 hover:text-stone-800">
            ← Back
          </Link>
        ) : null}
        <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-stone-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-10 text-center">
      {icon ? <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">{icon}</div> : null}
      <p className="font-semibold text-stone-800">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-stone-500">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-[13px] text-stone-500">{label}</p>
      <p className="tnum mt-1 font-display text-[26px] font-bold leading-tight tracking-tight text-stone-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-stone-500">{hint}</p> : null}
    </Card>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className={clsx("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
