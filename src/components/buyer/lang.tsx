"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Languages, Check } from "lucide-react";
import { LANGS, LANG_COOKIE, isLang, locale, translate, type Lang } from "@/lib/i18n/buyer";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (en: string, vars?: Record<string, string | number>) => string; loc: string };
const LangCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (en, v) => translate("en", en, v), loc: "en-IN" });

/** Holds the buyer's language. Starts from the cookie (read on the server); on a first visit follows the phone's language. */
export function LangProvider({ initial, children }: { initial?: Lang | null; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial ?? "en");
  useEffect(() => {
    if (initial) return;
    const nav = (navigator.language || "").slice(0, 2);
    if (nav === "hi" || nav === "gu") setLangState(nav);
  }, [initial]);
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en-IN" : locale(lang);
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, []);
  const t = useCallback((en: string, vars?: Record<string, string | number>) => translate(lang, en, vars), [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t, loc: locale(lang) }}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);

/** Read the saved language from a cookie value (server side). */
export const langFromCookie = (v: string | undefined): Lang | null => (isLang(v) ? v : null);

/** Round button that opens a three-way language menu. `tone` matches the surface it sits on. */
export function LangSwitch({ tone = "light" }: { tone?: "light" | "onColor" }) {
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  const cur = LANGS.find((x) => x.id === lang)!;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("Language")}
        aria-expanded={open}
        className={`press flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2.5 text-[13px] font-semibold ${tone === "onColor" ? "bg-white/15 text-white" : "bg-white/95 text-stone-900 shadow-card"}`}
      >
        <Languages className="h-4 w-4" />
        {cur.short}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 z-40 w-40 overflow-hidden rounded-2xl bg-white p-1 text-stone-900 shadow-float [animation:rise_.25s_cubic-bezier(.22,1,.36,1)_backwards]">
          {LANGS.map((x) => (
            <button key={x.id} role="menuitemradio" aria-checked={x.id === lang} onClick={() => { setLang(x.id); setOpen(false); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-stone-100">
              {x.name}
              {x.id === lang ? <Check className="h-4 w-4 text-agent" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
