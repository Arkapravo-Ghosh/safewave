import "server-only";

import { cookies } from "next/headers";

import { AUTH_COOKIE_MAX_AGE_SECONDS, AUTH_COOKIE_NAME, USER_ROLES, type UserRole } from "@/lib/auth/constants";
import { createSessionToken, verifySessionToken, type SessionTokenPayload } from "@/lib/auth/token";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function setSession(user: SessionUser): Promise<void> {
  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const cookieStore = await cookies();

  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getSession(): Promise<SessionTokenPayload | null> {
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
