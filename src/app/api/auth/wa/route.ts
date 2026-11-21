import { cookies } from "next/headers";
import { bad, json } from "@/lib/http";
import { isProd } from "@/config/env";
import { waLink } from "@/lib/phone";
import { botNumber } from "@/lib/wa";
import { startAgentSession } from "@/lib/auth/session";
import { createAgent, getAgentByPhone } from "@/modules/agents";
import { consumeVerification, createVerification, verificationText } from "@/modules/verify";

const NONCE = "pp_login_code";

/** Start WhatsApp login: the agent sends "LOGIN XXXXXX" to the bot, proving they own the number. */
export async function POST() {
  const code = await createVerification("agent_login");
  // Bind the code to this browser so only it can complete the login.
  (await cookies()).set(NONCE, code, { httpOnly: true, sameSite: "lax", secure: isProd, path: "/", maxAge: 15 * 60 });
  return json({ ok: true, code, waUrl: waLink(botNumber(), verificationText("agent_login", code)) });
}

export async function GET() {
  const jar = await cookies();
  const code = jar.get(NONCE)?.value;
  if (!code) return bad("expired", 410);
  const r = await consumeVerification(code, "agent_login");
  if (r.status !== "verified") return json({ status: r.status });
  const agent = (await getAgentByPhone(r.phone)) ?? (await createAgent(r.phone));
  if (agent.disabled) return bad("Account disabled. Contact support.", 403);
  await startAgentSession(agent.id);
  jar.delete(NONCE);
  return json({ status: "verified", next: agent.onboarded ? "/app" : "/app/welcome" });
}
