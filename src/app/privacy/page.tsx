import { brand } from "@/config/brand";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>Last updated: {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}. This policy explains how {brand.name} ({brand.company}) handles personal data, in line with India&apos;s Digital Personal Data Protection Act, 2023.</p>
      <h2>Who we are</h2>
      <p>{brand.name} provides real estate agents with tools to share property information and manage enquiries. For buyer data, the agent who shared the link decides why it is used; we process it on the agent&apos;s behalf.</p>
      <h2>Data we collect</h2>
      <ul>
        <li><b>Agents:</b> name, phone/WhatsApp number, company, photo/logo, listings and media you upload, payment records.</li>
        <li><b>Buyers:</b> pages viewed and actions on property links (anonymous by default). Name and mobile number <b>only if you choose to enter them</b> (to save, ask a question or request a visit).</li>
        <li>Technical data: device type and timestamps. We strip location (GPS) data from uploaded photos.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To show property pages and deliver your enquiry to the agent who shared the link.</li>
        <li>To show agents which of their buyers engaged with their properties.</li>
        <li>To produce aggregated, anonymised market insights (e.g. demand by locality). These never identify individual buyers.</li>
      </ul>
      <h2>What we never do</h2>
      <ul>
        <li>Sell or rent personal data.</li>
        <li>Share a buyer&apos;s details with any agent other than the one whose link they used.</li>
        <li>Send marketing messages to buyers.</li>
      </ul>
      <h2>Your rights</h2>
      <p>You can request access to, correction of, or deletion of your data at any time via <a href="/data" className="underline">/data</a> or by writing to {brand.supportEmail}. We respond within 30 days.</p>
      <h2>Storage & security</h2>
      <p>Data is stored with reputable cloud providers using encryption in transit. Access is restricted by agent account. Data is retained while an agent account is active and deleted on request.</p>
    </LegalPage>
  );
}
