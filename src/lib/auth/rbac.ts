import type { UserRole } from "@/lib/auth/constants";

const ROLE_LEVEL: Record<UserRole, number> = {
  user: 0,
  responder: 1,
  admin: 2,
  superadmin: 3,
};

export function hasRequiredRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}
