import { LegalPage } from "@/components/LegalPage";
import { DataRequestForm } from "./Form";

export const metadata = { title: "Your data" };

export default function DataPage() {
  return (
    <LegalPage title="Your data">
      <p>Viewed a property link and want your details removed, or a copy of what we hold? Enter the mobile number you used. We&apos;ll process it within 30 days.</p>
      <DataRequestForm />
    </LegalPage>
  );
}
