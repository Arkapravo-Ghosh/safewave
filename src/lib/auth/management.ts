import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { responders, users } from "@/db/schema";
import { createResponderUserForAdmin, listResponders } from "@/lib/crisis/responders";

export async function createAdminOwnedResponder(input: {
  adminId: string;
  name: string;
  email: string;
  password: string;
  role: "medical" | "fire" | "security";
  location: string;
}) {
  return createResponderUserForAdmin(input);
}

export async function listAdminOwnedResponders(adminId: string) {
  return listResponders({ ownerAdminId: adminId });
}

export async function listAdminsWithMeta() {
  const adminRows = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.createdAt));

  const results = [] as Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
    ownedResponderCount: number;
    activeResponderCount: number;
  }>;

  for (const admin of adminRows) {
    const ownedResponders = await db
      .select({ responder: responders })
      .from(responders)
      .innerJoin(users, eq(responders.userId, users.id))
      .where(and(eq(users.ownerAdminId, admin.id), eq(users.role, "responder")));

    const ownedResponderCount = ownedResponders.length;
    const activeResponderCount = ownedResponders.filter(
      (entry) => entry.responder.status === "available"
    ).length;

    results.push({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      createdAt: admin.createdAt.toISOString(),
      ownedResponderCount,
      activeResponderCount,
    });
  }

  return results;
}

export async function assignUserRoleBySuperadmin(input: {
  email: string;
  role: "user" | "admin";
}) {
  const row = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  const user = row[0];

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "superadmin") {
    throw new Error("Superadmin role cannot be changed from this action");
  }

  const updatedRows = await db
    .update(users)
    .set({
      role: input.role,
      ownerAdminId: input.role === "admin" ? null : user.ownerAdminId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  return updatedRows[0];
}
