import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { assertProdSecrets, env, isProd } from "@/config/env";
import { db } from "@/db";
import { agents, loginTokens } from "@/db/schema";
import { token as newToken } from "@/lib/ids";

const AGENT_COOKIE = "pp_session";
const ADMIN_COOKIE = "pp_admin";
const key = new TextEncoder().encode(env.SESSION_SECRET);
const cookieOpts = { httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/" };

async function sign(payload: Record<string, unknown>, days: number) {
  assertProdSecrets("session");
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${days}d`).sign(key);
}
async function verify<T>(jwt: string | undefined): Promise<T | null> {
  if (!jwt) return null;
  try {
    return (await jwtVerify(jwt, key)).payload as T;
  } catch {
    return null;
  }
}

/* ---------------- Agent ---------------- */

export async function startAgentSession(agentId: string) {
  (await cookies()).set(AGENT_COOKIE, await sign({ aid: agentId }, 180), { ...cookieOpts, maxAge: 180 * 86400 });
}
export async function endAgentSession() {
  (await cookies()).delete(AGENT_COOKIE);
}
export async function currentAgentId(): Promise<string | null> {
  const p = await verify<{ aid: string }>((await cookies()).get(AGENT_COOKIE)?.value);
  return p?.aid ?? null;
}
export async function currentAgent() {
  const aid = await currentAgentId();
  if (!aid) return null;
  const a = await db.query.agents.findFirst({ where: eq(agents.id, aid) });
  return a && !a.disabled ? a : null;
}
/** Use in /app pages & actions: returns the agent or redirects to login. */
export async function requireAgent() {
  const a = await currentAgent();
  if (!a) redirect("/app/login");
  return a;
}

/* Magic login links (sent on WhatsApp) */
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createLoginToken(agentId: string, minutes = 30): Promise<string> {
  const t = newToken();
  await db.insert(loginTokens).values({ tokenHash: hash(t), agentId, expiresAt: new Date(Date.now() + minutes * 60000) });
  return t;
}
export async function consumeLoginToken(t: string): Promise<string | null> {
  const [row] = await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(loginTokens.tokenHash, hash(t)), isNull(loginTokens.usedAt), gt(loginTokens.expiresAt, new Date())))
    .returning();
  return row?.agentId ?? null;
}

/* ---------------- Admin ---------------- */

export async function startAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, await sign({ adm: true }, 7), { ...cookieOpts, maxAge: 7 * 86400 });
}
export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
export async function isAdmin(): Promise<boolean> {
  return !!(await verify<{ adm: boolean }>((await cookies()).get(ADMIN_COOKIE)?.value))?.adm;
}
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
