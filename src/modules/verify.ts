import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { waVerifications } from "@/db/schema";
import { verifyCode } from "@/lib/ids";

/**
 * WhatsApp-click verification (free, replaces SMS OTP):
 * the browser shows a wa.me link with a pre-filled code; when the user presses send,
 * the bot sees the code + the sender's real number and marks it verified. The browser polls.
 */
export async function createVerification(purpose: "agent_login" | "buyer_verify", ctx: { sessionId?: string; shareCode?: string } = {}) {
  const code = verifyCode();
  await db.insert(waVerifications).values({ code, purpose, sessionId: ctx.sessionId, shareCode: ctx.shareCode, expiresAt: new Date(Date.now() + 15 * 60000) });
  return code;
}

export const verificationText = (purpose: "agent_login" | "buyer_verify", code: string) =>
  purpose === "agent_login" ? `LOGIN ${code} — please log me in` : `VERIFY ${code} — save my shortlist`;

export const CODE_RE = /\b(?:LOGIN|VERIFY)\s+([A-Z0-9]{6})\b/i;

/** Called by the bot. Returns the verification if the message carried a valid pending code. */
export async function markVerified(text: string, phone: string) {
  const m = text.match(CODE_RE);
  if (!m) return null;
  const [row] = await db
    .update(waVerifications)
    .set({ phone, verifiedAt: new Date() })
    .where(and(eq(waVerifications.code, m[1].toUpperCase()), isNull(waVerifications.verifiedAt), gt(waVerifications.expiresAt, new Date())))
    .returning();
  return row ?? null;
}

/** Browser poll: returns the verified phone once, then marks it consumed. */
export async function consumeVerification(code: string, purpose: "agent_login" | "buyer_verify") {
  const [row] = await db
    .update(waVerifications)
    .set({ consumedAt: new Date() })
    .where(and(eq(waVerifications.code, code), eq(waVerifications.purpose, purpose), isNull(waVerifications.consumedAt), gt(waVerifications.expiresAt, new Date())))
    .returning();
  if (!row) return { status: "expired" as const };
  if (!row.verifiedAt || !row.phone) {
    // not yet: undo consume
    await db.update(waVerifications).set({ consumedAt: null }).where(eq(waVerifications.code, code));
    return { status: "pending" as const };
  }
  return { status: "verified" as const, phone: row.phone, sessionId: row.sessionId, shareCode: row.shareCode };
}
