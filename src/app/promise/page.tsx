import { LegalPage } from "@/components/LegalPage";
import { AgentPromise } from "@/components/AgentPromise";

export const metadata = { title: "Our promise" };

export default function Promise() {
  return (
    <LegalPage title="Our promise to agents">
      <AgentPromise />
      <p>This promise is part of our <a href="/terms" className="underline">Terms of Service</a>. It doesn&apos;t change, even when we launch new products.</p>
    </LegalPage>
  );
}
