import { requireAgent } from "@/lib/auth/session";
import { appUrl } from "@/config/env";
import { PageHeader } from "@/components/ui";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Profile & branding" };

export default async function Settings() {
  const a = await requireAgent();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profile & branding" subtitle="How buyers see you on every property page." />
      <ProfileForm
        appUrl={appUrl}
        initial={{
          name: a.name,
          company: a.company ?? "",
          tagline: a.tagline ?? "",
          city: a.city ?? "",
          areas: a.areas ?? "",
          handle: a.handle,
          brandColor: a.brandColor,
          welcomeMode: a.welcomeMode,
          pageLook: a.pageLook,
          watermark: a.watermark,
          networkOptIn: a.networkOptIn,
          photoUrl: a.photoUrl,
          logoUrl: a.logoUrl,
        }}
      />
    </div>
  );
}
