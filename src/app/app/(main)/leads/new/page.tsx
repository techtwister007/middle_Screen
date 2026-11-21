import { createLeadAction } from "@/app/app/_actions/leads";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { RequirementFields } from "@/components/app/RequirementFields";

export const metadata = { title: "Add lead" };

export default function NewLead() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add a lead" back="/app/leads" subtitle="Tip: on WhatsApp, just forward a contact card to our number." />
      <Card className="p-5">
        <form action={createLeadAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><Input name="name" placeholder="Rahul Sharma" /></Field>
            <Field label="WhatsApp number"><Input name="phone" inputMode="tel" placeholder="98xxxxxxxx" /></Field>
          </div>
          <p className="text-sm font-semibold text-stone-700">What are they looking for? <span className="font-normal text-stone-500">(optional — powers matching)</span></p>
          <RequirementFields />
          <Button type="submit" size="lg" className="w-full">Save lead</Button>
        </form>
      </Card>
    </div>
  );
}
