import { jwtVerify, SignJWT, type JWTPayload } from "jose";

import { USER_ROLES, type UserRole } from "@/lib/auth/constants";

const SESSION_TOKEN_AUDIENCE = "safewave-users";
const SESSION_TOKEN_ISSUER = "safewave-app";

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("Missing required environment variable: AUTH_SECRET");
  }

  return new TextEncoder().encode(secret);
}

export type SessionTokenPayload = JWTPayload & {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function createSessionToken(
  payload: Pick<SessionTokenPayload, "sub" | "email" | "name" | "role">,
  expiresIn: string = "7d"
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setAudience(SESSION_TOKEN_AUDIENCE)
    .setIssuer(SESSION_TOKEN_ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      audience: SESSION_TOKEN_AUDIENCE,
      issuer: SESSION_TOKEN_ISSUER,
    });

    if (!payload.sub || !payload.email || !payload.name || !payload.role) {
      return null;
    }

    if (!USER_ROLES.includes(payload.role as UserRole)) {
      return null;
    }

    return payload as SessionTokenPayload;
  } catch {
    return null;
  }
}
