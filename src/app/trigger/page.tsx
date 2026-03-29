import { TriggerForm } from "@/components/crisis/trigger-form";
import { requireRole } from "@/lib/auth/guards";

export default async function TriggerPage() {
  await requireRole("user");

  return <TriggerForm />;
}
