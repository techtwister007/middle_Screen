import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { DM_Sans, Hind_Vadodara } from "next/font/google";
import { brand } from "@/config/brand";
import { appUrl } from "@/config/env";
import "./globals.css";

// Self-hosted at build time: no render-blocking request to Google on a buyer's 4G connection.
const dm = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-dm", display: "swap" });
// Gujarati and Devanagari fallback for names and places typed in local scripts.
const hind = Hind_Vadodara({ subsets: ["gujarati", "latin"], weight: ["400", "500", "600"], variable: "--font-hind", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: `${brand.name} — ${brand.tagline}`, template: `%s · ${brand.name}` },
  description: brand.description,
  applicationName: brand.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#101511" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${dm.variable} ${hind.variable}`} suppressHydrationWarning>
      <body>
        {/* Agent app welcome screen: show once per browser session, never with reduced motion.
            Runs before React and is never re-rendered by it (an inline <script> in a layout breaks action redirects). */}
        <Script id="pp-splash-once" strategy="beforeInteractive">
          {"try{if(location.pathname.indexOf('/app')===0&&location.pathname.indexOf('/app/login')!==0){if(sessionStorage.getItem('pp-splash')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('pp-splashed');else sessionStorage.setItem('pp-splash','1')}}catch(e){}"}
        </Script>
        {children}
      </body>
    </html>
  );
}
