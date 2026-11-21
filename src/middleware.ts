import { NextResponse, type NextRequest } from "next/server";

/**
 * After a product rename / domain change, old hostnames listed in APP_ALIAS_HOSTS
 * permanently redirect to APP_URL so every link ever shared keeps working.
 */
const aliases = (process.env.APP_ALIAS_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
const target = process.env.APP_URL ? new URL(process.env.APP_URL) : null;

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (target && aliases.includes(host) && host !== target.host) {
    const url = new URL(req.nextUrl.pathname + req.nextUrl.search, target);
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/|favicon|icon.svg|sw.js).*)"] };
