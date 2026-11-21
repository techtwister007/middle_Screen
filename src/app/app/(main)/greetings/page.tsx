import { requireAgent } from "@/lib/auth/session";
import { upcomingFestivals } from "@/lib/festivals";
import { PageHeader } from "@/components/ui";
import { GreetingPicker } from "./GreetingPicker";

export const metadata = { title: "Greeting cards" };

export default async function Greetings() {
  await requireAgent();
  const list = upcomingFestivals().map((f) => ({ id: f.id, name: f.name, title: f.title, line: f.line, days: f.days, motif: f.motif }));
  return (
    <div className="space-y-4">
      <PageHeader back="/app/more" title="Greeting cards" subtitle="Festival wishes in your colours with your name and number. Post them on WhatsApp Status or send to your contacts." />
      <GreetingPicker list={list} />
    </div>
  );
}
