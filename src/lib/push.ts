import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export const pushEnabled = () => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
let configured = false;

export async function pushToAgent(agentId: string, payload: { title: string; body: string; href?: string }) {
  if (!pushEnabled()) return;
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.agentId, agentId));
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
        else console.error("[push] failed", code);
      }
    }),
  );
}
