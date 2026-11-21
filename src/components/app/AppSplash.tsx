import { brand } from "@/config/brand";

/**
 * Branded welcome screen shown when the app is opened (once per browser session).
 * Pure CSS: it animates in and fades itself out in about 1.2 s, never blocks taps,
 * and a before-interactive script in the root layout hides it if it was already shown this session.
 */
export function AppSplash() {
  return (
    <>
      <div id="pp-splash" aria-hidden className="pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1f4d36] text-white [animation:splash-out_1.25s_ease-in_forwards]">
        <svg viewBox="0 0 64 64" className="h-20 w-20 [animation:mark-in_.55s_cubic-bezier(.22,1,.36,1)_both]">
          <rect width="64" height="64" rx="18" fill="#ffffff" />
          <path d="M16 33 32 19l16 14v14H38V37H26v10H16Z" fill="#1f4d36" />
          <path d="M18 33 32 21l14 12" fill="none" stroke="#3f8a63" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="40" style={{ animation: "draw .6s .25s cubic-bezier(.22,1,.36,1) forwards" }} />
        </svg>
        <p className="mt-5 text-[26px] font-semibold tracking-tight [animation:rise_.5s_.15s_cubic-bezier(.22,1,.36,1)_both]">{brand.name}</p>
        <p className="mt-1 text-sm text-white/75 [animation:rise_.5s_.25s_cubic-bezier(.22,1,.36,1)_both]">{brand.tagline}</p>
        <span className="mt-8 h-1 w-24 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full w-full origin-left rounded-full bg-white/80 [animation:bar-grow_.9s_.1s_cubic-bezier(.22,1,.36,1)_both]" />
        </span>
      </div>
    </>
  );
}
