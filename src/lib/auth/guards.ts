import "server-only";

import { redirect } from "next/navigation";

import type { UserRole } from "@/lib/auth/constants";
import { hasRequiredRole } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";

export async function requireAuth(redirectTo: string = "/login") {
  const session = await getSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}

export async function requireRole(role: UserRole, redirectTo: string = "/dashboard") {
  const session = await requireAuth();

  if (!hasRequiredRole(session.role, role)) {
    redirect(redirectTo);
  }

  return session;
}
