import type { UserRole } from "@/lib/auth/constants";

export function getHomeRouteForRole(role: UserRole) {
  if (role === "superadmin") {
    return "/superadmin";
  }

  if (role === "admin") {
    return "/admin";
  }

  if (role === "responder") {
    return "/responder";
  }

  return "/dashboard";
}
