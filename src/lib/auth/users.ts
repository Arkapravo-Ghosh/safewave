import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/db";

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  return user ?? null;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return user ?? null;
}

export async function updateUserNameById(id: string, name: string) {
  const [user] = await db
    .update(schema.users)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, id))
    .returning();

  return user ?? null;
}

export async function updateUserPasswordHashById(id: string, passwordHash: string) {
  const [user] = await db
    .update(schema.users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, id))
    .returning();

  return user ?? null;
}

export async function updateUserLastLocationById(
  id: string,
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
  }
) {
  const [user] = await db
    .update(schema.users)
    .set({
      lastLatitude: location.latitude,
      lastLongitude: location.longitude,
      lastLocationAccuracyMeters:
        location.accuracyMeters === undefined ? null : location.accuracyMeters,
      lastLocationRecordedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, id))
    .returning();

  return user ?? null;
}
