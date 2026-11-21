import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { LegalPage } from "@/components/LegalPage";
import { PROMISE_POINTS } from "@/components/AgentPromise";

export const metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>These terms govern your use of {brand.name}, provided by {brand.company}. By creating an account you agree to them.</p>
      <h2>1. Our promise to agents</h2>
      <ol className="ml-5 list-decimal space-y-1">{PROMISE_POINTS.map((p) => <li key={p} className="list-decimal">{p}</li>)}</ol>
      <h2>2. Your content</h2>
      <p>You own the listings, photos and videos you upload. You grant us a licence to host, resize, watermark and display them to operate the service. You confirm you have the right to share them and that listings are accurate and current. We may remove listings that are misleading, fraudulent or infringing.</p>
      <h2>3. Your leads</h2>
      <p>Leads and notes in your account belong to you. You can export them at any time. You are responsible for contacting buyers lawfully and only about the properties they enquired about.</p>
      <h2>4. Network listings</h2>
      <p>If you opt in, your public listings may later appear in a {brand.name} property discovery network. Enquiries are always routed to you. Private listings and buyer collections never appear publicly. You can change this per listing.</p>
      <h2>5. Plans & payment</h2>
      <p>New accounts get a {env.TRIAL_DAYS}-day free trial. After that the plan costs ₹{env.PLAN_PRICE_INR}/month (or as shown at checkout). If a plan lapses there is a {env.GRACE_DAYS}-day grace period; after that new listings, alerts and tracking pause, existing property pages remain visible for {env.PAGES_AFTER_LOCK_DAYS} more days and then show only your contact card. Renewing restores everything with full history. Payments are non-refundable except where required by law.</p>
      <h2>6. Acceptable use</h2>
      <p>No spam, no fake listings, no scraping, no misuse of buyer data. We may suspend accounts that break these rules.</p>
      <h2>7. Liability</h2>
      <p>The service is provided “as is”. To the extent permitted by law, our total liability is limited to the fees you paid in the 3 months before a claim.</p>
      <h2>8. Contact</h2>
      <p>{brand.supportEmail}</p>
    </LegalPage>
  );
}
