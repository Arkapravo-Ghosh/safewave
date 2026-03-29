import "server-only";

import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME, USER_ROLES, type UserRole } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/token";

export async function getApiSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  if (!USER_ROLES.includes(payload.role as UserRole)) {
    return null;
  }

  return payload;
}
