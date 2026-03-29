export const AUTH_COOKIE_NAME = "safewave_session";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const USER_ROLES = ["user", "responder", "admin", "superadmin"] as const;

export type UserRole = (typeof USER_ROLES)[number];
