import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/auth/constants";

const LABEL_MAP: Record<UserRole, string> = {
  user: "User",
  responder: "Responder",
  admin: "Admin",
  superadmin: "Superadmin",
};

export function RoleBadge({ role }: { role: UserRole }) {
  const variant = role === "user" ? "secondary" : "default";

  return <Badge variant={variant}>{LABEL_MAP[role]}</Badge>;
}
